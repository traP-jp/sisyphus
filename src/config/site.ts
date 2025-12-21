export type SiteConfig = typeof siteConfig;

export const siteConfig = {
	name: "Next.js + HeroUI",
	description: "Make beautiful websites regardless of your design experience.",
	navItems: [
		{
			label: "Home",
			href: "/",
		},
	],
	navMenuItems: [
		{
			label: "Test",
			href: "/test",
		},
	],
	links: {
		github: "https://github.com/traP-jp/demeter",
		docs: "https://github.com/traP-jp/demeter/blob/main/README.md",
	},
};
