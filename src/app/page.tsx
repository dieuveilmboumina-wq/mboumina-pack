import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function Root() {
  const lang = (await headers()).get("accept-language") ?? "";
  redirect(lang.toLowerCase().startsWith("en") ? "/en" : "/fr");
}
