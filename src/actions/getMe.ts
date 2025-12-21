"use server";

import { headers } from "next/headers";

export async function getMe() {
	const headersList = await headers();
	return headersList.get("X-Forwarded-User") || process.env.PTERON_USER_ID;
}

export default getMe;
