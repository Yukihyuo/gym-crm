import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { brandTheme } from "../../config/theme.config.js";

export const WelcomeEmail = ({
  clientName = "Cliente",
  username = "",
  password = "",
  brandName = "Nuestro gimnasio",
  brandEmail = "",
  brandPhone = "",
  brandLogo = "",
}) => {
  const previewText = `Tu cuenta de ${brandName} está lista. Usuario: ${username}`;

  const styles = {
    body: {
      backgroundColor: brandTheme.colors.background,
      color: brandTheme.colors.foreground,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: "40px 0",
    },
    container: {
      backgroundColor: brandTheme.colors.card,
      border: `1px solid ${brandTheme.colors.border}`,
      borderRadius: brandTheme.radius,
      margin: "0 auto",
      padding: "40px",
      width: "560px",
    },
    logo: {
      display: "block",
      margin: "0 auto 24px",
      borderRadius: "8px",
    },
    heading: {
      color: brandTheme.colors.cardForeground,
      fontSize: "24px",
      fontWeight: "700",
      textAlign: "center",
      margin: "0 0 16px",
    },
    text: {
      color: brandTheme.colors.mutedForeground,
      fontSize: "15px",
      lineHeight: "24px",
      textAlign: "center",
      margin: "0 0 24px",
    },
    credentialBox: {
      backgroundColor: brandTheme.colors.background,
      borderRadius: brandTheme.radius,
      border: `1px solid ${brandTheme.colors.border}`,
      padding: "24px",
      margin: "0 0 24px",
    },
    label: {
      color: brandTheme.colors.mutedForeground,
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      margin: "0 0 4px",
    },
    value: {
      color: brandTheme.colors.foreground,
      fontSize: "16px",
      fontWeight: "600",
      margin: "0 0 12px",
    },
    buttonContainer: {
      textAlign: "center",
    },
    button: {
      backgroundColor: brandTheme.colors.primary,
      color: brandTheme.colors.primaryForeground,
      borderRadius: brandTheme.radius,
      fontSize: "14px",
      fontWeight: "600",
      textDecoration: "none",
      textAlign: "center",
      display: "inline-block",
      padding: "12px 24px",
    },
    footer: {
      color: brandTheme.colors.mutedForeground,
      fontSize: "12px",
      textAlign: "center",
      marginTop: "24px",
    },
  };

  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(Preview, null, previewText),
    React.createElement(
      Body,
      { style: styles.body },
      React.createElement(
        Container,
        { style: styles.container },
        brandLogo
          ? React.createElement(Img, {
              src: brandLogo,
              width: "120",
              alt: brandName,
              style: styles.logo,
            })
          : null,
        React.createElement(Heading, { style: styles.heading }, `¡Bienvenido/a, ${clientName}!`),
        React.createElement(
          Text,
          { style: styles.text },
          "Tu cuenta en ",
          React.createElement("strong", null, brandName),
          " ya está activa. Usa estas credenciales para acceder a la plataforma:"
        ),
        React.createElement(
          Section,
          { style: styles.credentialBox },
          React.createElement(Text, { style: styles.label }, "Usuario"),
          React.createElement(Text, { style: styles.value }, username || "-"),
          React.createElement(Text, { style: styles.label }, "Contraseña temporal"),
          React.createElement(Text, { style: { ...styles.value, margin: 0 } }, password || "-")
        ),
        React.createElement(
          Section,
          { style: styles.buttonContainer },
          React.createElement(
            Button,
            {
              style: styles.button,
              href: process.env.CLIENT_WEB_URL || "https://client.nexay.fit",
            },
            "Acceder al panel"
          ),
          React.createElement(
            Text,
            { style: { ...styles.footer, marginTop: "16px" } },
            "Te recomendamos cambiar tu contraseña al ingresar."
          )
        ),
        React.createElement(Hr, { style: { borderColor: brandTheme.colors.border, margin: "32px 0" } }),
        React.createElement(
          Section,
          null,
          React.createElement(Text, { style: styles.footer }, brandName),
          brandEmail ? React.createElement(Text, { style: { ...styles.footer, marginTop: "4px" } }, `Email: ${brandEmail}`) : null,
          brandPhone ? React.createElement(Text, { style: { ...styles.footer, marginTop: "4px" } }, `Tel: ${brandPhone}`) : null
        )
      )
    )
  );
};