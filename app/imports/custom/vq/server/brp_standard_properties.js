import { Meteor } from 'meteor/meteor';
import { VQ_brp_standard_properties } from '../../../db/custom/vq/collections.js';

// Per-user, per-schema standard property set + BRP config
// Doc shape: { userId, schemaName, propertyIds: [Number], classWeightIncoming, propWeightStandart,
//              beta, edgesInTriples, useInstanceCount, closenessMode, cntTransformName, updatedAt }.

Meteor.methods({
	async saveBRPStandardProperties(schemaName, propertyIds) {
		const userId = Meteor.userId();
		if (!userId || !schemaName) return;
		const ids = Array.isArray(propertyIds) ? propertyIds.map(Number).filter(Number.isFinite) : [];
		await VQ_brp_standard_properties.upsertAsync(
			{ userId, schemaName },
			{ $set: { userId, schemaName, propertyIds: ids, updatedAt: new Date() } },
		);
	},

	async getBRPConfig(schemaName) {
		const userId = Meteor.userId();
		if (!userId || !schemaName) return null;
		const doc = await VQ_brp_standard_properties.findOneAsync({ userId, schemaName });
		if (!doc) return null;
		const { _id, userId: _u, schemaName: _s, updatedAt, ...config } = doc;
		return config;
	},

	async saveBRPConfig(schemaName, config) {
		const userId = Meteor.userId();
		if (!userId || !schemaName || !config) return;
		const ids = Array.isArray(config.propertyIds) ? config.propertyIds.map(Number).filter(Number.isFinite) : [];
		const setDoc = {
			userId,
			schemaName,
			propertyIds: ids,
			classWeightIncoming: Number(config.classWeightIncoming),
			propWeightStandart: Number(config.propWeightStandart),
			beta: Number(config.beta),
			edgesInTriples: !!config.edgesInTriples,
			useInstanceCount: !!config.useInstanceCount,
			closenessMode: config.closenessMode,
			cntTransformName: config.cntTransformName || null,
			updatedAt: new Date(),
		};
		await VQ_brp_standard_properties.upsertAsync({ userId, schemaName }, { $set: setDoc });
	},
});