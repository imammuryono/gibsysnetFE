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
			currencies: `${baseUrl}/currencies`,
			modelRisk: `${baseUrl}/modelrisk`,
			modelRiskLookup: `${baseUrl}/modelrisk`,
			partners: `${baseUrl}/partners`,
			riskVehicle: `${baseUrl}/risk-vehicle`,
			classConstruction: `${baseUrl}/class-construction`
		}
	};
})();
