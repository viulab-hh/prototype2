import { json } from '@sveltejs/kit';

const OBLASTS_URL =
	'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson';

export async function GET({ fetch }) {
	try {
		const response = await fetch(OBLASTS_URL);
		if (!response.ok) {
			return json({ features: [] }, { status: 200 });
		}

		const geojson = await response.json();
		return json({ features: geojson.features ?? [] });
	} catch {
		return json({ features: [] }, { status: 200 });
	}
}
