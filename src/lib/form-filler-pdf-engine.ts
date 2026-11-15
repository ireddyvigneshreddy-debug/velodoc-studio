import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  StandardFonts,
  rgb,
  PageSizes,
} from "pdf-lib";
import { toSafeArrayBuffer, createSafeFile } from "@/lib/utils";

export interface ParsedFormField {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio" | "unknown";
  currentValue: string | boolean;
  options?: string[];
  isReadOnly: boolean;
}

/**
 * Inspects a PDF and extracts all interactive AcroForm fields
 */
export async function parsePdfFormFields(
  pdfBuffer: ArrayBuffer
): Promise<{ hasForm: boolean; fields: ParsedFormField[] }> {
  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });

  try {
    const form = pdfDoc.getForm();
    const rawFields = form.getFields();

    if (!rawFields || rawFields.length === 0) {
      return { hasForm: false, fields: [] };
    }

    const fields: ParsedFormField[] = [];

    for (const f of rawFields) {
      const name = f.getName();
      const isReadOnly = f.isReadOnly();

      if (f instanceof PDFTextField) {
        fields.push({
          name,
          type: "text",
          currentValue: f.getText() || "",
          isReadOnly,
        });
      } else if (f instanceof PDFCheckBox) {
        fields.push({
          name,
          type: "checkbox",
          currentValue: f.isChecked(),
          isReadOnly,
        });
      } else if (f instanceof PDFDropdown) {
        fields.push({
          name,
          type: "dropdown",
          currentValue: f.getSelected()[0] || "",
          options: f.getOptions(),
          isReadOnly,
        });
      } else if (f instanceof PDFRadioGroup) {
        fields.push({
          name,
          type: "radio",
          currentValue: f.getSelected() || "",
          options: f.getOptions(),
          isReadOnly,
        });
      } else {
        fields.push({
          name,
          type: "unknown",
          currentValue: "",
          isReadOnly,
        });
      }
    }

    return { hasForm: fields.length > 0, fields };
  } catch (err) {
    console.warn("PDF does not contain AcroForm dictionary:", err);
    return { hasForm: false, fields: [] };
  }
}

/**
 * Fills interactive AcroForm fields and optionally flattens the form
 */
export async function fillAndFlattenPdfForm(
  pdfBuffer: ArrayBuffer,
  fieldValues: Record<string, string | boolean>,
  flatten = false
): Promise<Uint8Array> {
  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  for (const [name, val] of Object.entries(fieldValues)) {
    try {
      const field = form.getField(name);
      if (!field) continue;

      if (field instanceof PDFTextField) {
        field.setText(String(val ?? ""));
      } else if (field instanceof PDFCheckBox) {
        if (val === true || val === "true") {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFDropdown) {
        if (typeof val === "string" && val.length > 0) {
          field.select(val);
        }
      } else if (field instanceof PDFRadioGroup) {
        if (typeof val === "string" && val.length > 0) {
          field.select(val);
        }
      }
    } catch (e) {
      console.warn(`Could not set value for field "${name}":`, e);
    }
  }

  // Flatten & Lock Form if requested
  if (flatten) {
    form.flatten();
  }

  return await pdfDoc.save();
}

/**
 * Generates an official sample fillable internship registration AcroForm PDF for 1-click testing
 */
export async function generateSampleFillableFormPdf(): Promise<File> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { height: pH } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  // Form Header Banner
  page.drawRectangle({
    x: 40,
    y: pH - 100,
    width: 515,
    height: 60,
    color: rgb(0.08, 0.15, 0.28),
  });

  page.drawText("ACADEMIC INTERNSHIP & LAB REGISTRATION FORM", {
    x: 60,
    y: pH - 65,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Institute of Aeronautical Engineering • Academic Year 2026-2027", {
    x: 60,
    y: pH - 85,
    size: 9.5,
    font: fontReg,
    color: rgb(0.85, 0.9, 0.98),
  });

  const form = doc.getForm();

  // Field 1: Full Name
  page.drawText("Full Name of Candidate:", { x: 50, y: pH - 135, size: 10, font: fontBold, color: rgb(0.15, 0.2, 0.28) });
  const nameField = form.createTextField("fullName");
  nameField.setText("K. Vignesh Reddy");
  nameField.addToPage(page, { x: 50, y: pH - 165, width: 495, height: 24 });

  // Field 2: Roll Number
  page.drawText("University Roll Number:", { x: 50, y: pH - 205, size: 10, font: fontBold, color: rgb(0.15, 0.2, 0.28) });
  const rollField = form.createTextField("rollNumber");
  rollField.setText("26951A6701");
  rollField.addToPage(page, { x: 50, y: pH - 235, width: 235, height: 24 });

  // Field 3: Department / Branch Dropdown
  page.drawText("Branch / Specialization:", { x: 310, y: pH - 205, size: 10, font: fontBold, color: rgb(0.15, 0.2, 0.28) });
  const deptField = form.createDropdown("department");
  deptField.addOptions([
    "CSE (Data Science)",
    "CSE (AI & Machine Learning)",
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Comm. Engg",
  ]);
  deptField.select("CSE (Data Science)");
  deptField.addToPage(page, { x: 310, y: pH - 235, width: 235, height: 24 });

  // Field 4: Project Title
  page.drawText("Internship Research Domain / Project Topic:", { x: 50, y: pH - 275, size: 10, font: fontBold, color: rgb(0.15, 0.2, 0.28) });
  const topicField = form.createTextField("projectTopic");
  topicField.setText("Autonomous In-Memory WebAssembly Document Security Architectures");
  topicField.addToPage(page, { x: 50, y: pH - 305, width: 495, height: 24 });

  // Field 5: Contact Email
  page.drawText("Institutional Email Address:", { x: 50, y: pH - 345, size: 10, font: fontBold, color: rgb(0.15, 0.2, 0.28) });
  const emailField = form.createTextField("emailAddress");
  emailField.setText("vigneshreddy@iare.ac.in");
  emailField.addToPage(page, { x: 50, y: pH - 375, width: 495, height: 24 });

  // Field 6: Declarations Checkbox
  const agreeCheck = form.createCheckBox("agreeHonorCode");
  agreeCheck.check();
  agreeCheck.addToPage(page, { x: 50, y: pH - 425, width: 18, height: 18 });

  page.drawText("I confirm that all information provided is accurate and adheres to the Academic Honor Code.", {
    x: 76,
    y: pH - 420,
    size: 9.5,
    font: fontReg,
    color: rgb(0.2, 0.25, 0.35),
  });

  const labAccessCheck = form.createCheckBox("requireLabAccess");
  labAccessCheck.check();
  labAccessCheck.addToPage(page, { x: 50, y: pH - 455, width: 18, height: 18 });

  page.drawText("Request High-Performance Computing (HPC) & GPU Cluster Sandbox access.", {
    x: 76,
    y: pH - 450,
    size: 9.5,
    font: fontReg,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Footer note
  page.drawText("Instructions: You can edit the fillable form fields above or flatten the document to prevent edits.", {
    x: 50,
    y: 40,
    size: 8,
    font: fontReg,
    color: rgb(0.5, 0.55, 0.6),
  });

  const bytes = await doc.save();
  return createSafeFile(bytes, "sample_fillable_internship_form.pdf", "application/pdf");
}
