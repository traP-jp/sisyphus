import { heroui } from "@heroui/theme";

import { iconsPlugin, getIconCollections } from "@egoist/tailwindcss-icons";

/** @type {import('tailwindcss').Config} */
const config = {
	content: [
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-sans)"],
				mono: ["var(--font-mono)"],
			},
		},
	},
	darkMode: "class",
	plugins: [
		heroui(),
	iconsPlugin({
  collections: getIconCollections(["tabler", "lucide","material-symbols"])
})
	],
};

module.exports = config;
