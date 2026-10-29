import Keycloak from "keycloak-js"

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: "dwp",
  clientId: "dwp-frontend",
})

let initPromise: Promise<boolean> | undefined

/**
 * Starts the login flow once. React StrictMode runs effects twice in development,
 * and keycloak-js refuses to initialise twice, so the promise is cached.
 */
export function initKeycloak(): Promise<boolean> {
  if (initPromise) return initPromise
  const started = keycloak.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  })
  initPromise = started
  return started
}