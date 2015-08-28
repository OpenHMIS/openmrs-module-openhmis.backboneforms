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
	[
		openhmis.url.backboneBase + 'js/model/generic',
		openhmis.url.backboneBase + 'js/lib/i18n'
	],
	function(openhmis, __) {
		//TODO can we re-build the openhmis.Location object to re-order locations?
		openhmis.Location = openhmis.GenericModel.extend({
			meta: {
				name: __("Location"),
				namePlural: __("Locations"),
				restUrl: 'v1/location'
			},

			schema: {
				name: 'Text'
			},

			toString: function() {
				var display = this.get("display");
				var name = this.get("name");
				var url = this.get("links") === undefined || this.get("links")[0] === undefined ? undefined : this.get("links")[0].uri;
				var display2 = this.get("display");
				var name2 = this.get("name");
				
				if(url !== undefined) {
					$.ajax({async:false, dataType:"json", url:url, success: function(loc) {
						if(loc !== null && loc != undefined) {
							var parentLoc = loc.parentLocation;
							
							name = loc.name;
							
							//TODO re-structure this algorithm so that the child locations can appear below their parent and still indented
							if(parentLoc !== null && parentLoc !== undefined) {
								if(display !== null && display !== undefined) {
									display = "&nbsp;&nbsp;" + display;
								}
								if(name !== null && name !== undefined) {
									name = "&nbsp;&nbsp;" + name;
								}
								$.ajax({url:parentLoc.links[0].uri, dataType:"json", async:false, success: function(pLoc) {
									if(pLoc !== null && pLoc != undefined) {
										if(pLoc.parentLocation !== null && pLoc.parentLocation !== undefined) {
											display = "&nbsp;&nbsp;&nbsp;&nbsp;" + display2;
											name = "&nbsp;&nbsp;&nbsp;&nbsp;" + name2;
										}
									}
								}});
							}
						}
					}});
				}
				
				return display || name;
			}
		});

		return openhmis;
	}
);
