const { withGradleProperties } = require('expo/config-plugins')

const withAbiFilters = (config, { abiFilters = ['arm64-v8a'] } = {}) => {
	// Set gradle.properties
	config = withGradleProperties(config, (config) => {
		// Convert array to comma-separated string for gradle.properties
		const architecturesString = abiFilters.join(',')

		// Set the reactNativeArchitectures property
		config.modResults = config.modResults.filter(
			(item) => !item.key || item.key !== 'reactNativeArchitectures',
		)

		config.modResults.push({
			type: 'property',
			key: 'reactNativeArchitectures',
			value: architecturesString,
		})

		return config
	})

	// React Native's Gradle plugin derives ndk.abiFilters from this property.
	return config
}

module.exports = withAbiFilters
