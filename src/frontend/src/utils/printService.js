/**
 * Print Service - Reusable PDF generation utility
 *
 * This service provides functions to generate PDF documents from HTML content
 * with barcode support. It can be used for sales documents, invoices, and other
 * printable documents throughout the application.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';

/**
 * Generate a barcode as a data URL
 * @param {string} value - The value to encode in the barcode
 * @param {object} options - Barcode options
 * @returns {string} Base64 encoded barcode image
 */
export function generateBarcode(value, options = {}) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: false,
    margin: 10,
    ...options,
  });
  return canvas.toDataURL('image/png');
}

/**
 * Print sales document to PDF
 * @param {object} documentData - The sales document data
 * @param {object} formatters - Helper functions for formatting (formatDate, getDocumentTypeLabel, getPaymentOptionLabel)
 */
export async function printSalesDocumentPDF(documentData, formatters) {
  const { formatDate, getDocumentTypeLabel, getPaymentOptionLabel } = formatters;

  // Create a hidden div to render the document
  const printContainer = document.createElement('div');
  printContainer.style.position = 'absolute';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
  printContainer.style.width = '210mm'; // A4 width
  printContainer.style.background = 'white';
  printContainer.style.padding = '15mm';
  printContainer.style.fontFamily = 'Arial, sans-serif';
  printContainer.style.fontSize = '10px';
  printContainer.style.color = '#0f1624';

  document.body.appendChild(printContainer);

  // Build the HTML content
  const html = `
    <div style="max-width: 170mm; margin: 0 auto;">
      <!-- Document Information Section -->
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; margin: 0 0 10px 0; color: #0f1624; font-weight: 600;">Document Information</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Document Number:</div>
            <div style="font-size: 10px; color: #0f1624; font-weight: 500;">${documentData.documentNumber}</div>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Document Type:</div>
            <div style="font-size: 10px; color: #0f1624; font-weight: 500;">${getDocumentTypeLabel(documentData.documentType)}</div>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Issue Date:</div>
            <div style="font-size: 10px; color: #0f1624; font-weight: 500;">${formatDate(documentData.issueDate)}</div>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Client:</div>
            <div style="font-size: 10px; color: #0f1624; font-weight: 500;">
              ${documentData.clientName || "—"}
              ${documentData.clientData?.type === "Company" && documentData.clientData?.taxId ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">Tax ID: ${documentData.clientData.taxId}</div>` : ''}
            </div>
          </div>
          ${documentData.clientData?.address ? `
            <div style="grid-column: 1 / -1;">
              <div style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Client Address:</div>
              <div style="font-size: 10px; color: #0f1624; font-weight: 500;">
                ${documentData.clientData.address.street} ${documentData.clientData.address.building}${documentData.clientData.address.premises ? `/${documentData.clientData.address.premises}` : ''}, ${documentData.clientData.address.postalCode} ${documentData.clientData.address.city}, ${documentData.clientData.address.country}
              </div>
            </div>
          ` : ''}
          ${documentData.description ? `
            <div style="grid-column: 1 / -1;">
              <div style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Description:</div>
              <div style="font-size: 10px; color: #0f1624; font-weight: 500;">${documentData.description}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Document Items Section -->
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; margin: 0 0 10px 0; color: #0f1624; font-weight: 600;">Document Items</h2>
        ${documentData.items && documentData.items.length > 0 ? `
          <div style="overflow-x: auto; border-radius: 6px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Product</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">SKU</th>
                  <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Location</th>
                  <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Unit Price</th>
                  <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Net</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax Amt</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Gross</th>
                </tr>
              </thead>
              <tbody>
                ${documentData.items.map(item => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">${item.productName || `Product #${item.productId}`}</td>
                    <td style="padding: 5px 8px; font-family: 'Courier New', monospace; font-size: 8px; color: #64748b;">${item.productSKU || "—"}</td>
                    <td style="padding: 5px 8px; text-align: center;">
                      ${item.fromLocationCode ? `<span style="background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 3px; font-size: 7px; font-weight: 600; font-family: 'Courier New', monospace; border: 1px solid #cbd5e1;">${item.fromLocationCode}</span>` : `<span style="color: #cbd5e1; font-style: italic;">—</span>`}
                    </td>
                    <td style="padding: 5px 8px; text-align: center; font-weight: 600;">${item.quantity}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">$${item.unitPriceNet.toFixed(2)}</td>
                    <td style="padding: 5px 8px; font-size: 8px; color: #64748b; text-align: center;">
                      ${item.taxCode ? (() => {
                        const match = item.taxCode.match(/\d+/);
                        return match ? `${match[0]}%` : item.taxCode;
                      })() : "—"}
                    </td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">$${item.lineNet.toFixed(2)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">$${item.lineTax.toFixed(2)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624;">$${item.lineGross.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot style="background: #f1f5f9; font-weight: 600;">
                <tr>
                  <td colspan="6" style="padding: 6px 8px; text-align: right; font-weight: 700; color: #475569; border-top: 2px solid #e2e8f0; font-size: 9px;">Subtotal:</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">$${documentData.totalNet.toFixed(2)}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">$${documentData.totalTax.toFixed(2)}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">$${documentData.totalGross.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : `
          <p style="text-align: center; color: #94a3b8; font-style: italic; padding: 30px; background: #f8fafc; border-radius: 8px;">No items in this document.</p>
        `}
      </div>

      <!-- Tax Summary Section -->
      <div style="margin-bottom: 15px;">
        <h2 style="font-size: 13px; margin: 0 0 10px 0; color: #0f1624; font-weight: 600;">Tax Summary</h2>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 9px; font-weight: 600; color: #475569;">Total Net Amount:</span>
            <span style="font-size: 10px; font-weight: 600; font-family: 'Courier New', monospace; color: #0f1624;">$${documentData.totalNet.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 9px; font-weight: 600; color: #475569;">Total Tax Amount:</span>
            <span style="font-size: 10px; font-weight: 600; font-family: 'Courier New', monospace; color: #0f1624;">$${documentData.totalTax.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; margin-top: 4px; border-top: 2px solid #cbd5e1;">
            <span style="font-size: 10px; font-weight: 700; color: #0f1624;">Total Gross Amount:</span>
            <span style="font-size: 12px; font-weight: 700; font-family: 'Courier New', monospace; color: #0f1624;">$${documentData.totalGross.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Payment Details Section -->
      <div style="margin-bottom: 15px;">
        <h2 style="font-size: 13px; margin: 0 0 10px 0; color: #0f1624; font-weight: 600;">Payment Details</h2>
        ${documentData.payments && documentData.payments.length > 0 ? `
          <div style="overflow-x: auto; border-radius: 6px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Method</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Amount</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Paid</th>
                </tr>
              </thead>
              <tbody>
                ${documentData.payments.map(payment => {
                  const methodLabel = getPaymentOptionLabel(payment.paymentOption);

                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 5px 8px; font-weight: 500;">
                        <span style="color: #0f1624; padding: 3px 6px; border-radius: 3px; font-size: 8px; font-weight: 600; text-transform: capitalize; border: 1px solid #cbd5e1; background: #f8fafc;">
                          ${methodLabel}
                        </span>
                      </td>
                      <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624; font-size: 9px;">$${payment.amount.toFixed(2)}</td>
                      <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624; font-size: 9px;">$${(payment.amountTendered || payment.amount).toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot style="background: #f1f5f9; font-weight: 600;">
                <tr>
                  <td colspan="3" style="padding: 6px 8px; text-align: right; font-size: 9px; border-top: 2px solid #e2e8f0;">
                    ${(() => {
                      const totalAmount = documentData.payments.reduce((sum, p) => sum + p.amount, 0);
                      const totalPaid = documentData.payments.reduce((sum, p) => sum + (p.amountTendered || p.amount), 0);
                      const totalChange = documentData.payments.reduce((sum, p) => sum + (p.change || 0), 0);

                      return `
                        <span style="color: #0f1624; font-weight: bold;">Total: $${totalAmount.toFixed(2)}</span>
                        <span style="margin: 0 6px; color: #cbd5e1;">│</span>
                        <span style="color: #0f1624; font-weight: bold;">Paid: $${totalPaid.toFixed(2)}</span>
                        <span style="margin: 0 6px; color: #cbd5e1;">│</span>
                        <span style="color: #0f1624; font-weight: bold;">Change: $${totalChange.toFixed(2)}</span>
                      `;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : `
          <p style="text-align: center; color: #94a3b8; font-style: italic; padding: 30px; background: #f8fafc; border-radius: 8px;">No payments recorded for this document.</p>
        `}
      </div>

      ${documentData.documentType === 2 || documentData.documentType === 3 || documentData.documentType === 'InvoicePersonal' || documentData.documentType === 'InvoiceCompany' ? `
        <!-- Signature Section -->
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; page-break-inside: avoid;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <!-- Issued By -->
            <div style="text-align: center;">
              <div style="border-bottom: 1px solid #0f1624; padding-bottom: 6px; margin-bottom: 6px; min-height: 40px;">
              </div>
              <div style="font-size: 9px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">
                Issued By
              </div>
              <div style="font-size: 7px; color: #64748b; margin-top: 2px;">
                (Signature & Date)
              </div>
            </div>

            <!-- Received By -->
            <div style="text-align: center;">
              <div style="border-bottom: 1px solid #0f1624; padding-bottom: 6px; margin-bottom: 6px; min-height: 40px;">
              </div>
              <div style="font-size: 9px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">
                Received By
              </div>
              <div style="font-size: 7px; color: #64748b; margin-top: 2px;">
                (Signature & Date)
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Barcode Section -->
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; page-break-inside: avoid;">
        <div id="barcode-container" style="display: inline-block;"></div>
        <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 8px; font-family: 'Courier New', monospace;">
          ${documentData.documentNumber}
        </div>
      </div>
    </div>
  `;

  printContainer.innerHTML = html;

  // Generate and insert barcode
  const barcodeContainer = printContainer.querySelector('#barcode-container');
  const barcodeCanvas = document.createElement('canvas');
  JsBarcode(barcodeCanvas, documentData.documentNumber, {
    format: 'CODE128',
    width: 1.5,
    height: 40,
    displayValue: false,
    margin: 0,
  });
  barcodeContainer.appendChild(barcodeCanvas);

  // Wait for fonts and images to load
  await new Promise(resolve => setTimeout(resolve, 500));

  // Capture the content as canvas
  const canvas = await html2canvas(printContainer, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Remove the temporary container
  document.body.removeChild(printContainer);

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Add additional pages if content overflows
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  // Save the PDF
  const fileName = `Sales_Document_${documentData.documentNumber.replace(/\//g, '_')}_${new Date().getTime()}.pdf`;
  pdf.save(fileName);

  return fileName;
}

/**
 * Generic print function for any HTML content with optional barcode
 * Can be extended for other document types (invoices, receipts, reports, etc.)
 *
 * @param {string} htmlContent - The HTML content to print
 * @param {string} fileName - The output PDF file name
 * @param {string} barcodeValue - Optional barcode value to add at the bottom
 */
export async function printGenericDocument(htmlContent, fileName, barcodeValue = null) {
  const printContainer = document.createElement('div');
  printContainer.style.position = 'absolute';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
  printContainer.style.width = '210mm';
  printContainer.style.background = 'white';
  printContainer.style.padding = '20mm';

  document.body.appendChild(printContainer);

  let content = htmlContent;

  // Add barcode if value provided
  if (barcodeValue) {
    content += `
      <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e2e8f0; text-align: center;">
        <div id="barcode-container" style="display: inline-block;"></div>
        <div style="font-size: 14px; font-weight: 600; color: #475569; margin-top: 10px; font-family: 'Courier New', monospace;">
          ${barcodeValue}
        </div>
      </div>
    `;
  }

  printContainer.innerHTML = content;

  // Generate barcode if needed
  if (barcodeValue) {
    const barcodeContainer = printContainer.querySelector('#barcode-container');
    if (barcodeContainer) {
      const barcodeCanvas = document.createElement('canvas');
      JsBarcode(barcodeCanvas, barcodeValue, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
      });
      barcodeContainer.appendChild(barcodeCanvas);
    }
  }

  // Wait for rendering
  await new Promise(resolve => setTimeout(resolve, 500));

  // Capture and convert to PDF
  const canvas = await html2canvas(printContainer, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(printContainer);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(fileName);

  return fileName;
}



/**
 * Print sales report to PDF
 * @param {object} reportData - The sales report data  
 * @param {object} formatters - Helper functions for formatting
 */
export async function printSalesReportPDF(reportData, formatters) {
  const { formatCurrency, formatPercentage, formatDate, formatTime } = formatters;

  const printContainer = document.createElement('div');
  printContainer.style.position = 'absolute';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
  printContainer.style.width = '210mm';
  printContainer.style.background = 'white';
  printContainer.style.padding = '15mm';
  printContainer.style.fontFamily = 'Arial, sans-serif';
  printContainer.style.fontSize = '10px';
  printContainer.style.color = '#0f1624';

  document.body.appendChild(printContainer);

  const html = `
    <div style="max-width: 170mm; margin: 0 auto;">
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 18px; margin: 0 0 5px 0; color: #0f1624; font-weight: 700; text-align: center;">Sales Report</h1>
        <div style="font-size: 11px; color: #64748b; font-weight: 500; text-align: center;">
          From ${formatDate(reportData.dateFrom)} to ${formatDate(reportData.dateTo)}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; margin: 0 0 10px 0; color: #0f1624; font-weight: 600;">Earnings Summary</h2>
        <div style="overflow-x: auto; border-radius: 6px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Metric</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Receipts</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Invoices Personal</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Invoices Company</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">Count of Documents</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${reportData.receipts.count}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${reportData.invoicesPersonal.count}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${reportData.invoicesCompany.count}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624;">${reportData.total.count}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">Total Net Amount</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.receipts.totalNet)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.invoicesPersonal.totalNet)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.invoicesCompany.totalNet)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624;">${formatCurrency(reportData.total.totalNet)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">Total Tax Amount</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.receipts.totalTax)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.invoicesPersonal.totalTax)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.invoicesCompany.totalTax)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624;">${formatCurrency(reportData.total.totalTax)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">Total Gross Amount</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.receipts.totalGross)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.invoicesPersonal.totalGross)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(reportData.invoicesCompany.totalGross)}</td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624;">${formatCurrency(reportData.total.totalGross)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; margin: 0 0 10px 0; color: #0f1624; font-weight: 600;">Tax Breakdown</h2>
        
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; margin: 0 0 8px 0; color: #475569; font-weight: 600;">Products</h3>
          <div style="overflow-x: auto; border-radius: 6px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax Code</th>
                  <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax Rate</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Total Products</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Distinct Products</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.taxBreakdown.map(tax => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">${tax.taxCode}</td>
                    <td style="padding: 5px 8px; text-align: center; font-size: 8px; color: #64748b;">${formatPercentage(tax.taxRate)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${tax.totalProducts}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${tax.distinctProducts}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot style="background: #f1f5f9; font-weight: 600;">
                <tr>
                  <td colspan="2" style="padding: 6px 8px; text-align: right; font-weight: 700; color: #475569; border-top: 2px solid #e2e8f0; font-size: 9px;">Total:</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">${reportData.taxBreakdown.reduce((sum, tax) => sum + tax.totalProducts, 0)}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">${reportData.taxBreakdown.reduce((sum, tax) => sum + tax.distinctProducts, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; margin: 0 0 8px 0; color: #475569; font-weight: 600;">Values</h3>
          <div style="overflow-x: auto; border-radius: 6px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax Code</th>
                  <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax Rate</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Receipts Tax</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Invoices Personal Tax</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Invoices Company Tax</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.taxBreakdown.map(tax => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 5px 8px; color: #0f1624; font-weight: 500;">${tax.taxCode}</td>
                    <td style="padding: 5px 8px; text-align: center; font-size: 8px; color: #64748b;">${formatPercentage(tax.taxRate)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(tax.taxReceipts)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(tax.taxInvoicesPersonal)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace;">${formatCurrency(tax.taxInvoicesCompany)}</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f1624;">${formatCurrency(tax.taxTotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot style="background: #f1f5f9; font-weight: 600;">
                <tr>
                  <td colspan="2" style="padding: 6px 8px; text-align: right; font-weight: 700; color: #475569; border-top: 2px solid #e2e8f0; font-size: 9px;">Total:</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">${formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxReceipts, 0))}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">${formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxInvoicesPersonal, 0))}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">${formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxInvoicesCompany, 0))}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #0f1624; font-size: 10px; text-align: right; border-top: 2px solid #e2e8f0;">${formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxTotal, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #94a3b8; font-style: italic;">
        Report generated on ${formatDate(reportData.generatedAt)} at ${formatTime(reportData.generatedAt)} by ${reportData.generatedBy}
      </div>
    </div>
  `;

  printContainer.innerHTML = html;
  await new Promise(resolve => setTimeout(resolve, 500));
  const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
  document.body.removeChild(printContainer);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }
  const fromDate = formatDate(reportData.dateFrom).replace(/\//g, '-');
  const toDate = formatDate(reportData.dateTo).replace(/\//g, '-');
  const fileName = `Sales_Report_${fromDate}_to_${toDate}_${new Date().getTime()}.pdf`;
  pdf.save(fileName);
  return fileName;
}
