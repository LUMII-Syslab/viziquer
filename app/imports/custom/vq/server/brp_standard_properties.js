import { Meteor } from 'meteor/meteor';
import { VQ_brp_standard_properties } from '../../../db/custom/vq/collections.js';

// Per-user, per-schema standard property set for the BRP fragment algorithm.
// Doc shape: { userId, schemaName, propertyIds: [Number], updatedAt }.

Meteor.methods({
	async getBRPStandardProperties(schemaName) {
		const userId = Meteor.userId();
		if (!userId || !schemaName) return null;
		const doc = await VQ_brp_standard_properties.findOneAsync({ userId, schemaName });
		return doc ? doc.propertyIds : null;
	},

	async saveBRPStandardProperties(schemaName, propertyIds) {
		const userId = Meteor.userId();
		if (!userId || !schemaName) return;
		const ids = Array.isArray(propertyIds) ? propertyIds.map(Number).filter(Number.isFinite) : [];
		await VQ_brp_standard_properties.upsertAsync(
			{ userId, schemaName },
			{ $set: { userId, schemaName, propertyIds: ids, updatedAt: new Date() } },
		);
	},
});
