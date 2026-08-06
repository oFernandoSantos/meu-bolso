export function mascararEmail(email) {
  if (!email || !email.includes("@")) return null;
  const [usuario, dominio] = email.split("@");
  return `${usuario.slice(0, 4)}***@${dominio}`;
}

export function mascararToken(token) {
  if (!token) return null;
  if (token.length < 10) return "***";
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}
