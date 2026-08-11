import puppeteer from "puppeteer";
import { receiptTemplate } from "../templates/receipt.template.js";

export const generateReceiptPDF = async (payment) => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

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
