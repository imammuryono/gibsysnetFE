(() => {
	// FIXED PORT ASSIGNMENT:
	// Frontend: port 3000 (Apache/XAMPP)
	// Backend: port 3001 (Node.js APIs - PERMANENT, no changes)
	const baseUrl = 'http://localhost:3001/api';

	localStorage.setItem('gibsynet_api_base', baseUrl);

	window.GibsyNetApi = {
		baseUrl,
		endpoints: {
			cob: `${baseUrl}/cob`,
			quotation: `${baseUrl}/quotations`,
			currency: `${baseUrl}/currency`,
			modelRisk: `${baseUrl}/modelrisk`,
			modelRiskLookup: `${baseUrl}/modelrisk`,
			partners: `${baseUrl}/partners`,
			riskVehicle: `${baseUrl}/risk-vehicle`,
			riskVehicleObject: `${baseUrl}/risk-vehicle-object`,
			riskVehicleCoverage: `${baseUrl}/risk-vehicle-coverage`,
			classConstruction: `${baseUrl}/class-construction`,
			// User Management
			users: `${baseUrl}/users`,
			auth: `${baseUrl}/auth`
		}
	};
})();
