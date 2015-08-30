/*
 * The contents of this file are subject to the OpenMRS Public License
 * Version 2.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
define(
		[ openhmis.url.backboneBase + 'js/lib/jquery',
				openhmis.url.backboneBase + 'js/lib/backbone',
				openhmis.url.backboneBase + 'js/lib/underscore',
				openhmis.url.backboneBase + 'js/model/generic',
				openhmis.url.backboneBase + 'js/lib/backbone-forms',
				openhmis.url.backboneBase + 'js/lib/labelOver',
				openhmis.url.backboneBase + 'js/view/list',
				openhmis.url.backboneBase + 'js/model/location',
				openhmis.url.backboneBase + 'js/model/user',
				openhmis.url.backboneBase + 'js/model/role' ],
		function($, Backbone, _, openhmis) {
			var editors = Backbone.Form.editors;

			editors.isNumeric = function(strVal) {
				return /^-?[0-9]*\.?[0-9]*?$/.test(strVal);
			};

			editors.BasicNumber = editors.Number.extend({
				initialize : function(options) {
					this.defaultValue = null;
					editors.Text.prototype.initialize.call(this, options);
				},

				/**
				 * Check value is numeric
				 */
				onKeyPress : function(event) {
					var self = this, delayedDetermineChange = function() {
						setTimeout(function() {
							self.determineChange();
						}, 0);
					}
					if (event.keyCode == 9) {
						return;
					}
					// Allow backspace && enter
					if (event.which == 8 || event.which == 13) {
						delayedDetermineChange();
						return;
					}

					// Get the whole new value so that we can prevent things
					// like double decimals points etc.
					var newVal = this.$el.val()
							+ String.fromCharCode(event.which);

					if (editors.isNumeric(newVal)) {
						delayedDetermineChange();
					} else {
						event.preventDefault();
					}
				},

				setValue : function(value) {
					if (value !== undefined && value !== null
							&& this.schema.format) {
						this.$el.val(this.schema.format(value));
					} else {
						this.$el.val(value);
					}
				},

				focus : function(select) {
					editors.Number.prototype.focus.call(this);

					if (select === true)
						this.$el.select();
				}
			});

			editors.CustomNumber = editors.Number
					.extend({
						initialize : function(options) {
							this.events = _.extend(this.events, {
								'click' : 'determineChange'
							});
							editors.Number.prototype.initialize.call(this,
									options);
							if (options && options.schema)
								this.minimum = options.schema.minimum;
						},

						onKeyPress : function(event) {
							var self = this, delayedDetermineChange = function() {
								setTimeout(function() {
									self.determineChange();
								}, 0);
							};
							if (event.keyCode == 9) {
								return;
							}
							// Allow backspace and minus character
							if (event.which == 8 || event.which == 45) {
								delayedDetermineChange();
								return;
							}

							// Get the whole new value so that we can prevent
							// things like double decimals points etc.
							var newVal = this.$el.val()
									+ String.fromCharCode(event.which);

							if (editors.isNumeric(newVal)) {
								delayedDetermineChange();
							} else {
								event.preventDefault();
							}
						},

						setValue : function(value) {
							this.el.defaultValue = value;
							editors.Number.prototype.setValue.call(this, value);
						},

						determineChange : function(event) {
							if (this.minimum
									&& parseInt(this.$el.val()) < this.minimum) {
								this.$el.val(this.minimum);
								return;
							}
							editors.Number.prototype.determineChange.call(this,
									event);
						},

						focus : function(select) {
							editors.Number.prototype.focus.call(this);
							if (select === true)
								this.$el.select();
						}
					});

			editors.TrueFalseCheckbox = editors.Checkbox.extend({
				getValue : function() {
					var tmpValue = editors.Checkbox.prototype.getValue
							.call(this);
					return tmpValue == true ? true : false;
				}
			});

			/**
			 * "Abstract" editor class. Extend and specify modelType and
			 * displayAttr properties. See inventory module editors.js for
			 * examples.
			 */
			editors.GenericModelSelect = editors.Select
					.extend({
						blankItem : null,

						initialize : function(options) {
							editors.Select.prototype.initialize.call(this,
									options);

							if (this.schema.modelType) {
								this.modelType = this.schema.modelType;
							}

							if (this.schema.displayAttr) {
								this.displayAttr = this.schema.displayAttr;
							}

							this.blankItem = new this.modelType({
								name : "- Not Defined -"
							});
						},

						renderOptions : function(options) {
							// Add in the "Not Defined" item before rendering
							// the options
							if (this.allowNull) {
								var item0 = options.at(0);
								if (!item0 || item0.id != this.blankItem.id) {
									options.add(this.blankItem, {
										at : 0,
										silent : true
									});
								}
							}

							editors.Select.prototype.renderOptions.call(this,
									options);
						},

						getValue : function() {
							$selected = this.$('option:selected');

							var model = new this.modelType({
								uuid : $selected.val()
							});
							var displayAttr = this.displayAttr || "display";
							if (model == this.blankItem) {
								model.set(displayAttr, null, {
									silent : true
								});
							} else {
								model.set(displayAttr, $selected.text(), {
									silent : true
								});
							}

							return model;
						},

						setValue : function(value) {
							if (value === null) {
								return;
							}

							if (_.isString(value)) {
								this.$el.val(value);
							} else if (value.attributes) {
								this.$el.val(value.id); // Backbone model
							} else if (!isNaN(parseFloat(value))) {
								// This should be after Backbone model because
								// it can evaluate
								// to a number :S
								this.$el.val(value);
							} else {
								this.$el.val(value.uuid); // bare object
							}
						},

						render : function() {
							if (this.options.options !== undefined) {
								this.setOptions(this.options.options);
							} else {
								if (this.schema.options instanceof Backbone.Collection) {
									if (this.schema.options.length > 0) {
										// Collection has already been loaded so
										// just render it
										this.renderOptions(this.schema.options);
									} else {
										// Load the collection manually so that
										// we can set the limit
										var self = this;
										this.schema.options
												.fetch({
													success : function() {
														var hierarchicalLocations = new Backbone.Collection();
														// Render the options
														// once complete
														self.schema.options.models = reorganizeLocationModels(self.schema.options.models);
														
														for (i = 0; i < self.schema.options.models.length; i++) {
															organizeLocationHierarchicallyFrom(
																	self.schema.options.models[i],
																	hierarchicalLocations);
														}
														self.schema.options.models = hierarchicalLocations.models;
														self.renderOptions(self.schema.options);
													},
													limit : openhmis.rest.maxResults
												});
									}
								} else {
									this.setOptions(this.schema.options);
								}
							}

							return this;
						}
					});

			editors.Autocomplete = editors.Select
					.extend({
						tagName : "span",
						previousValue : "",

						initialize : function(options) {
							_.bindAll(this, "onSelect");

							editors.Select.prototype.initialize.call(this,
									options);
							this.text = new editors.Text();

							this.minLength = options.schema.minLength ? options.schema.minLength
									: 2;

							var self = this;
							this.text.on("focus", function(event) {
								self.trigger("focus", self);
							});
							this.text.on("blur", function(event) {
								self.trigger("blur", self);
							});

							this.selectedItem = null;
						},

						onSelect : function(event, ui) {
							if (ui && ui.item) {
								this.selectedItem = ui.item;
								this.trigger("select", ui.item);
							}

							this.text.trigger("change", this);
						},

						getValue : function() {
							if (this.selectedItem
									&& this.selectedItem.label === this.text
											.getValue()) {
								return this.selectedItem.value;
							} else {
								return this.text.getValue();
							}
						},

						setValue : function(value) {
							this.text.setValue(value);
						},

						focus : function() {
							if (this.hasFocus)
								return;
							{
								this.text.focus();
							}
						},

						blur : function() {
							if (this.hasFocus) {
								this.text.blur();
							}
						},

						renderOptions : function(options) {
							var source;
							var isBbCollection = false;

							if (options instanceof Backbone.Collection) {
								isBbCollection = true;
								source = options.map(function(item) {
									return {
										label : item.toString(),
										value : item
									}
								});
							} else {
								source = this.schema.options;
							}

							var $autoComplete = this.text.$el.autocomplete({
								minLength : this.minLength,
								source : source,
								select : this.onSelect,
								autoFocus : true
							});

							if (isBbCollection) {
								$autoComplete.data("autocomplete")._renderItem = function(
										ul, item) {
									return $("<li></li>").data(
											"item.autocomplete", item).append(
											"<a>" + item.label + "</a>")
											.appendTo(ul);
								};
							}
						},

						render : function() {
							if (this.$el.html() === "") {
								this.$el.append(this.text.el);
							}

							editors.Select.prototype.render.call(this);

							return this;
						}
					});

			editors.List.NestedModel = editors.List.NestedModel.extend({
				onModalSubmitted : function(form, modal) {
					var isNew = !this.value;

					// Stop if there are validation errors
					var error = form.validate();
					if (error) {
						return modal.preventClose();
					}
					this.modal = null;

					var idAttribute = Backbone.Model.prototype.idAttribute;
					if (this.value) {
						var id = this.value.id || this.value[idAttribute];
					}

					// If OK, render the list item
					this.value = form.getValue();

					if (id !== undefined) {
						this.value[idAttribute] = id;
					}

					this.renderSummary();

					if (isNew) {
						this.trigger('readyToAdd');
					}

					this.trigger('change', this);

					this.trigger('close', this);
					this.trigger('blur', this);
				}
			});

			editors.LocationSelect = editors.GenericModelSelect.extend({
				modelType : openhmis.Location,
				displayAttr : "name",
				allowNull : true
			});

			editors.UserSelect = editors.GenericModelSelect.extend({
				modelType : openhmis.User,
				displayAttr : "name",
				allowNull : true
			});

			editors.RoleSelect = editors.GenericModelSelect.extend({
				modelType : openhmis.Role,
				displayAttr : "name",
				allowNull : true
			});

			editors.ListSelect = editors.Base
					.extend({
						modalWidth : 600,
						initialize : function(options) {
							_.bindAll(this, 'updateSelected', 'clearSelection');
							options = options || {};
							editors.Base.prototype.initialize.call(this,
									options);
							if (!options.schema.options) {
								throw "Missing required schema.options.";
							}
						},

						getValue : function() {
							return this.value;
						},

						setValue : function(value) {
							this.value = value;
							this.updateSelected();
						},

						focus : function() {
							if (this.hasFocus)
								return;

							this.trigger("focus");
						},

						blur : function() {
							if (!this.hasFocus)
								return;

							this.trigger("blur");
						},

						initListView : function() {
							var options = this.schema.editorOptions || {};
							options.model = this.schema.options;
							this.listView = new openhmis.GenericListView(
									options);
						},

						updateSelected : function(view) {
							if (view && view.model)
								this.value = view.model;
							else if (view === null)
								this.value = null;
							this.$(".selected").text(
									"Selected: " + (this.value || "None"));
							this.$(".clear_selection").css("display",
									this.value ? "inline" : "none");
						},

						clearSelection : function(event) {
							event.preventDefault();
							this.updateSelected(null);
							this.listView.blur();
						},

						render : function() {
							this.initListView();
							this.$el
									.html('<p><span class="selected"></span> <a href="#" title="Clear selection" class="clear_selection">Clear</a></p>');
							this.$el.append(this.listView.el);
							this.listView.fetch();
							this.updateSelected();
							this.listView.on("itemSelect", this.updateSelected);
							this.$(".clear_selection").click(
									this.clearSelection);
							return this;
						}

					});

			return editors;
		});

	function organizeLocationHierarchicallyFrom(location, hierarchicalLocations) {
		var loc;
		var parentChildren;
		var children;
		var parent;
		
		if (location !== null && location !== undefined) {
			if (location.uuid === undefined && location.links === undefined) {
				location.fetch({
					async : false,
					success : function(fetchedLoc) {
						loc = fetchedLoc;
					}
				});
	
				children = loc === undefined || loc === null ? undefined : loc
						.get("childLocations");
				parent = loc === undefined || loc === null ? undefined : loc
						.get("parentLocation");
			} else {
				$.ajax({
					async : false,
					url : location.links[0].uri,
					dataType : "json",
					success : function(fetchedLoc) {
						loc = fetchedLoc;
					}
				});
	
				children = loc === undefined || loc === null ? undefined
						: loc.childLocations;
				parent = loc === undefined || loc === null ? undefined
						: loc.parentLocation;
			}
	
			if (parent !== undefined && parent !== null) {
				$.ajax({
					async : false,
					url : parent.links[0].uri,
					dataType : "json",
					success : function(fetchedLoc) {
						parentChildren = fetchedLoc.childLocations;
					}
				});
			}
			
			if (parent !== null && parent !== undefined) {
				var rightParent = recreateRightModelObject(parent.name, parent.display, parent.uuid, parent.links[0].uri);
				
				if(!hierarchicalLocations.contains(rightParent)) {
					hierarchicalLocations.add(rightParent);
					if (parentChildren !== null && parentChildren !== undefined
							&& parentChildren.length > 0) {
						for (j = 0; j < parentChildren.length; j++) {
							var parentChild = parentChildren[j];
		
							if (parentChild !== null && parentChild !== undefined) {
								var rightParentChild = recreateRightModelObject(parentChild.name, parentChild.display, parentChild.uuid, parentChild.links[0].uri);
								
								if(!hierarchicalLocations.contains(rightParentChild)) {
									hierarchicalLocations.add(rightParentChild);
								}
							}
						}
					}
				}
			}
			
			var rightLocation = recreateRightModelObject(loc.get("name") || loc.name, loc.get("display") || loc.display, loc.get("uuid") || loc.uuid, loc.get("links") || loc.links[0].uri);
			
			if (children !== null && children !== undefined && children.length > 0) {
				if (loc !== null && loc !== undefined
						&& !hierarchicalLocations.contains(rightLocation)) {
					hierarchicalLocations.add(rightLocation);
				}
				for (j = 0; j < children.length; j++) {
					var child = children[j];
	
					if (child !== null && child !== undefined) {
						var rightChild = recreateRightModelObject(child.name, child.display, child.uuid, child.links[0].uri);
						
						if(!hierarchicalLocations.contains(rightChild)) {
							var childChildren;
							
							hierarchicalLocations.add(rightChild);
							$.ajax({
								async : false,
								url : rightChild.get("links")[0].uri,
								dataType : "json",
								success : function(fetchedLoc) {
									childChildren = fetchedLoc.childLocations;
								}
							});
							if(childChildren !== (null || undefined)) {
								for(l = 0; l < childChildren.length; l++) {
									var childChild = childChildren[l];
									var rightChildChild = recreateRightModelObject(childChild.name, childChild.display, childChild.uuid, childChild.links[0].uri);
									
									if(!hierarchicalLocations.contains(rightChildChild)) {
										hierarchicalLocations.add(rightChildChild);
									}
								}
							}
						}
					}
				}
			}
			if (loc !== null && loc !== undefined
					&& !hierarchicalLocations.contains(rightLocation)) {
				hierarchicalLocations.add(rightLocation);
			}
		}
	}
	
	function recreateRightModelObject(name, display, uuid, link) {
		var model = new openhmis.Location();
		
		model.id = uuid;
		model.set("name", name);
		model.set("uuid", uuid);
		model.set("display", display);
		model.set("links", [{"uri":link}]);
		
		return model;
	}
	
	/**
	 * Organizes location models in order, super parents with no parent but children, parents with both parents and children and lastly children with no parents
	 */
	function reorganizeLocationModels(locationModels) {
		if(locationModels !== null && locationModels !== undefined && locationModels.length > 0) {
			//self.schema.options.models
			var hasNoParentsAndNoChildren = new Backbone.Collection();	
			var hasNoParentsButChildren = new Backbone.Collection();
			var hasParentButNoChildren = new Backbone.Collection();
			var hasChildrenAndParent = new Backbone.Collection();
			var theRest = new Backbone.Collection();
			var newLocationModels = new Backbone.Collection();
			var previousLength = locationModels.length;
			
			for(i = 0; i < previousLength; i++) {
				var location = locationModels[i];
				var loc;
					
				location.fetch({
					async : false,
					success : function(fetchedLoc) {
						loc = fetchedLoc;
					}
				});
				if(loc !== null || undefined && location !== null || undefined) {
					if(((loc.get("parentLocation") || loc.parentLocation) === (null || undefined)) && ((loc.get("childLocations") || loc.childLocations) === (null || undefined))) {//has no parent and no children
						hasNoParentsAndNoChildren.add(location);
					} else if(((loc.get("parentLocation") || loc.parentLocation) === (null || undefined)) && ((loc.get("childLocations") || loc.childLocations) !== (null || undefined))) {//has no parent but has children
						hasNoParentsButChildren.add(location);
					} else if(((loc.get("parentLocation") || loc.parentLocation) !== (null || undefined)) && ((loc.get("childLocations") || loc.childLocations) === (null || undefined))) {//has parent and no children
						hasParentButNoChildren.add(location);
					} else if(((loc.get("parentLocation") || loc.parentLocation) !== (null || undefined)) && ((loc.get("childLocations") || loc.childLocations) !== (null || undefined))) {//has parent and children
						hasChildrenAndParent.add(location);
					} else {
						theRest.add(location);
					}
				} else {
					theRest.add(location);
				}
			}
			newLocationModels.add(hasNoParentsButChildren.models);
			newLocationModels.add(hasChildrenAndParent.models);
			newLocationModels.add(hasParentButNoChildren.models);
			newLocationModels.add(hasNoParentsAndNoChildren.models);
			newLocationModels.add(theRest.models);
			if(newLocationModels.models.length ===previousLength) {
				return newLocationModels.models;
			} else
				return locationModels;
		} else {
			return locationModels;
		}
	}
