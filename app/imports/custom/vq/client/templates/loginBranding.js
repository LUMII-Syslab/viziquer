import { Template } from 'meteor/templating.js'

import './loginBranding.html'

Template.loginBranding.helpers({
	toolVersion() {
		// return '0.5.1';
		return Session.get('_toolVersion');
	},
	toolName() {
		// return 'MyViziQuer';
		return Session.get('_toolName');
	},
	toolSiteName() {
		// return 'viziquer.com';
		return Session.get('_toolSiteName');
	},
	toolSiteURL() {
		// return 'https://viziquer.com';
		return Session.get('_toolSiteURL');
	},

  platformName() {
		return Session.get('_platformName');
	},
  platformVersion() {
		return Session.get('_platformVersion');
	},
  currentYear() {
		return new Date().getFullYear();
	},

});
