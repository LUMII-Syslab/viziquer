import { Template } from 'meteor/templating.js'

import './loginBranding.html'

Template.loginBranding.helpers({
	toolVersion: function() {
		return '0.5.1';
	},
	toolName: function() {
		return 'MyViziQuer';
	},
	toolSiteName: function() {
		return 'viziquer.com';
	},
	toolSiteURL: function() {
		return 'https://viziquer.com';
	},

});
