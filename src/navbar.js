import React, { useState, useEffect } from 'react';

const ConfigurableNavbar = () => {
	const [config, setConfig] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/navbar-config.json')
			.then(response => response.json())
			.then(data => {
				setConfig(data);
				setLoading(false);
			})
			.catch(error => {
				console.error('Failed to load navbar configuration:', error);
				setLoading(false);
			});
	}, []);

	if (loading) {
		return <div id="archnavbar">Loading...</div>;
	}

	if (!config) {
		return <div id="archnavbar">Failed to load navigation</div>;
	}

	return (
		<div id="archnavbar">
			<div id="logo">
				<a href={config.logo.url} title={config.logo.title}>
					{config.logo.text}
				</a>
			</div>
			<div id="archnavbarmenu">
				<ul id="archnavbarlist">
					{config.menuItems.map(item => (
						<li key={item.id} id={item.id}>
							<a href={item.url} title={item.title}>
								{item.text}
							</a>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};

export default ConfigurableNavbar;
