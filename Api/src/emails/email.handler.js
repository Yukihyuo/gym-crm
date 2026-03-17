import { render } from "@react-email/render"
import React from "react"

import { transporter } from "../config/email.config.js"

import { WelcomeEmail } from "./mails/WelcomeEmail.js"

export const sendWelcomeEmail = async (client, brand) => {
  try {
    const clientName = [client?.profile?.names, client?.profile?.lastNames]
      .filter(Boolean)
      .join(" ") || client?.username

    const username = client?.username
    const defaultPassword = client?.username

    const emailHtml = await render(
      React.createElement(WelcomeEmail, {
        clientName,
        username,
        password: defaultPassword,
        brandName: brand?.name,
        brandEmail: brand?.email,
        brandPhone: brand?.phone,
        brandLogo: brand?.logo,
      })
    )

    const info = await transporter.sendMail({
      from: `"${brand?.name || "Tu Empresa"}" <${process.env.EMAIL_FROM}>`,
      to: client.email,
      subject: `Bienvenido a ${brand?.name || "nuestro gimnasio"}, ${clientName}`,
      html: emailHtml,
    });

    console.log("Mensaje enviado: %s", info.messageId);
    return info;

  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

export const sendNewSubscriptionEmail = async (client, subscription, brand) => {

}