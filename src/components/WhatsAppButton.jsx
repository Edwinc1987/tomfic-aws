// Botón de WhatsApp de TOMFIC. Se usa en la LANDING (FAB flotante) y en la vista
// del ADMINISTRADOR (botón "Soporte"). NO se usa en el capturador.
// Número de la empresa (Colombia +57). Cambiar aquí actualiza todos los botones.
export const WA_PHONE = "573185872017";
export const waLink = (msg) =>
  `https://wa.me/${WA_PHONE}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

function WaIcon({ size = 20, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.5 14.4c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.15-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.4 1.02 2.76 1.17 2.95.15.19 2.01 3.07 4.87 4.3.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.34zM12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.42 1.27 4.86L2 22l5.28-1.38A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
    </svg>
  );
}

// FAB flotante para la landing (esquina inferior derecha).
export function WhatsAppFab({ message }) {
  return (
    <a href={waLink(message)} target="_blank" rel="noopener noreferrer"
       aria-label="Escríbenos por WhatsApp"
       style={{ position: "fixed", right: 20, bottom: 20, zIndex: 9997, background: "#25d366", width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(37,211,102,0.45)", textDecoration: "none" }}>
      <WaIcon size={30} />
    </a>
  );
}

// Botón inline (topbar del admin, footer, etc.).
export function WhatsAppButton({ message, label = "WhatsApp", style = {} }) {
  return (
    <a href={waLink(message)} target="_blank" rel="noopener noreferrer"
       title="Escríbenos por WhatsApp"
       style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25d366", color: "#fff", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none", ...style }}>
      <WaIcon size={15} /> {label}
    </a>
  );
}
