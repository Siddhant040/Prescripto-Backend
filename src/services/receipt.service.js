import puppeteer from "puppeteer";
import { receiptTemplate } from "../templates/receipt.template.js";

export const generateReceiptPDF = async (payment) => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
   console.log("Doctor =", payment.doctor);
console.log("Doctor name =", payment.doctor?.name);
console.log("Doctor user =", payment.doctor?.user);
console.log("Patient =", payment.patient);
console.log("Patient name =", payment.patient?.name);

    await page.setContent(receiptTemplate(payment), {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    return pdf;
  } finally {
    await browser.close();
  }
};