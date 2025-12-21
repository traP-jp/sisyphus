"use server";

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	const requestHeaders = new Headers(request.headers);
	if (process.env.USER_NAME) {
		requestHeaders.set("X-Forwarded-User", process.env.USER_NAME);
	}

	if (
		process.env.AUTHORIZED_USERS &&
		!process.env.AUTHORIZED_USERS.split(";").includes(
			requestHeaders.get("X-Forwarded-User") ?? ""
		)
	) {
		request.nextUrl.pathname = "/forbidden";
		return NextResponse.rewrite(request.nextUrl, { status: 403 });
	}

	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
}
