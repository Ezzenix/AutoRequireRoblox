export default function reconcile(value: any, template: any): any {
	if (typeof value !== "object" || typeof template !== "object" || value === null || template === null) {
		return value;
	}

	const reconciled: any = {};

	for (const key in template) {
		if (template.hasOwnProperty(key)) {
			if (value.hasOwnProperty(key)) {
				reconciled[key] = reconcile(value[key], template[key]);
			} else {
				reconciled[key] = template[key];
			}
		}
	}

	for (const key in value) {
		if (value.hasOwnProperty(key) && !reconciled.hasOwnProperty(key)) {
			reconciled[key] = value[key];
		}
	}

	return reconciled;
}
