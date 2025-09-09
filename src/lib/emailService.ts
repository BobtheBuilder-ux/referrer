import jsPDF from 'jspdf';

// Admin email configuration
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL;

interface DistributorIntakeData {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  country: string;
  city: string;
  provinceState: string;
  computedScore?: number;
  computedTier?: string;
  requestedServices: Record<string, boolean>;
  serviceNotes?: string;
  submittedAt: string;
  [key: string]: any;
}

interface EmailResult {
  success: boolean;
  message: string;
  emailId?: string;
}

/**
 * Generates a formatted PDF from distributor intake form data
 */
export function generateDistributorPDF(data: DistributorIntakeData): Uint8Array {
  const doc = new jsPDF();
  let yPosition = 20;
  const lineHeight = 8;
  const sectionSpacing = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with word wrapping
  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: string; maxWidth?: number }) => {
    const fontSize = options?.fontSize || 10;
    const fontStyle = options?.fontStyle || 'normal';
    const maxWidth = options?.maxWidth || contentWidth;
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  // Helper function to add section header
  const addSectionHeader = (title: string, y: number) => {
    doc.setFillColor(59, 130, 246); // Blue background
    doc.rect(margin, y - 5, contentWidth, 12, 'F');
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, y + 3);
    doc.setTextColor(0, 0, 0); // Reset to black
    return y + 20;
  };

  // Helper function to add field
  const addField = (label: string, value: string | number | string[], y: number) => {
    if (value === undefined || value === null || value === '') return y;
    
    let displayValue = '';
    if (Array.isArray(value)) {
      displayValue = value.length > 0 ? value.join(', ') : 'None specified';
    } else {
      displayValue = String(value);
    }
    
    if (displayValue.trim() === '') return y;
    
    // Add label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${label}:`, margin, y);
    
    // Add value with word wrapping
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(displayValue, contentWidth - 60);
    doc.text(lines, margin + 60, y);
    
    return y + (lines.length * lineHeight) + 3;
  };

  // Check if we need a new page
  const checkNewPage = (currentY: number, requiredSpace: number = 30) => {
    if (currentY + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };

  // Document Header
  doc.setFillColor(31, 41, 55); // Dark gray background
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('OneShopCentrale', margin, 20);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Vendor Onboarding & Pricing Quote', margin, 28);
  doc.setTextColor(0, 0, 0);
  
  yPosition = 50;

  // Submission Date
  yPosition = addText(`Submitted: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, margin, yPosition, { fontSize: 10, fontStyle: 'italic' });
  yPosition += sectionSpacing;

  // Contact Information Section
  yPosition = checkNewPage(yPosition);
  yPosition = addSectionHeader('Contact Information', yPosition);
  yPosition = addField('Company Name', data.company, yPosition);
  yPosition = addField('First Name', data.firstName, yPosition);
  yPosition = addField('Last Name', data.lastName, yPosition);
  yPosition = addField('Email', data.email, yPosition);
  yPosition = addField('Phone', data.phone, yPosition);
  yPosition = addField('Website', data.website || '', yPosition);
  yPosition = addField('Role', data.role, yPosition);
  yPosition = addField('Country', data.country, yPosition);
  yPosition = addField('City', data.city, yPosition);
  yPosition = addField('Province/State', data.provinceState, yPosition);
  yPosition = addField('Postal/Zip Code', data.postalZip, yPosition);
  yPosition += sectionSpacing;

  // Coverage Area Section
  yPosition = checkNewPage(yPosition);
  yPosition = addSectionHeader('Coverage Area', yPosition);
  yPosition = addField('Coverage Description', data.coverageDescription, yPosition);
  if (data.coverageProvinces && data.coverageProvinces.length > 0) {
    yPosition = addField('Coverage Provinces', data.coverageProvinces.join(', '), yPosition);
  }
  if (data.coverageStates && data.coverageStates.length > 0) {
    yPosition = addField('Coverage States', data.coverageStates.join(', '), yPosition);
  }
  if (data.languages) {
    const langs = [];
    if (data.languages.english) langs.push('English');
    if (data.languages.french) langs.push('French');
    if (data.languages.spanish) langs.push('Spanish');
    if (data.languages.other) langs.push(data.languages.other);
    yPosition = addField('Languages', langs.join(', '), yPosition);
  }
  yPosition += sectionSpacing;

  // Network & Business Metrics Section
  yPosition = checkNewPage(yPosition);
  yPosition = addSectionHeader('Network & Business Metrics', yPosition);
  if (data.networkCounts) {
    const networks: string[] = [];
    Object.entries(data.networkCounts).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 0) networks.push(`${key}: ${value}`);
    });
    if (networks.length > 0) {
      yPosition = addField('Network Counts', networks.join(', '), yPosition);
    }
  }
  yPosition = addField('Monthly Doors Serviced', data.monthlyDoorsServiced, yPosition);
  yPosition = addField('Decision Makers', data.decisionMakers, yPosition);
  yPosition = addField('Avg Monthly Sell-In (CAD)', data.avgMonthlySellInCAD ? `$${data.avgMonthlySellInCAD.toLocaleString()}` : '', yPosition);
  yPosition = addField('Deals Last 12 Months', data.dealsLast12mo, yPosition);
  
  if (data.chainAccess) {
    const chains: string[] = [];
    Object.entries(data.chainAccess).forEach(([key, value]) => {
      if (value === true) chains.push(key);
      if (key === 'other' && value && typeof value === 'string') chains.push(value);
    });
    if (chains.length > 0) {
      yPosition = addField('Chain Access', chains.join(', '), yPosition);
    }
  }
  yPosition += sectionSpacing;

  // Logistics & Compliance Section
  yPosition = checkNewPage(yPosition);
  yPosition = addSectionHeader('Logistics & Compliance', yPosition);
  if (data.logistics) {
    yPosition = addField('Warehouse Sq Ft', data.logistics.warehouseSqFt, yPosition);
    yPosition = addField('Cold Chain', data.logistics.coldChain ? 'Yes' : 'No', yPosition);
    yPosition = addField('Trucks Owned', data.logistics.trucksOwned, yPosition);
    yPosition = addField('Third Party Logistics', data.logistics.thirdPartyLogistics ? 'Yes' : 'No', yPosition);
  }
  
  if (data.compliance) {
    const complianceItems = [];
    if (data.compliance.cfiaImporter) complianceItems.push('CFIA Importer');
    if (data.compliance.fdaRegistered) complianceItems.push('FDA Registered');
    if (data.compliance.gs1) complianceItems.push('GS1');
    if (data.compliance.coiInsurance) complianceItems.push('COI Insurance');
    if (complianceItems.length > 0) {
      yPosition = addField('Compliance Certifications', complianceItems.join(', '), yPosition);
    }
  }
  yPosition += sectionSpacing;

  // Product Categories & Services Section
  yPosition = checkNewPage(yPosition);
  yPosition = addSectionHeader('Product Categories & Services', yPosition);
  if (data.categories) {
    const selectedCategories: string[] = [];
    Object.entries(data.categories).forEach(([key, value]) => {
      if (value === true) selectedCategories.push(key);
    });
    if (selectedCategories.length > 0) {
      yPosition = addField('Product Categories', selectedCategories.join(', '), yPosition);
    }
  }
  yPosition = addField('Categories Other', data.categoriesOther || '', yPosition);
  yPosition = addField('Exclusivity Interest', data.exclusivityInterest, yPosition);
  yPosition = addField('MOQ Capacity Units', data.moqCapacityUnits, yPosition);
  
  if (data.requestedServices && Array.isArray(data.requestedServices)) {
    yPosition = addField('Requested Services', data.requestedServices.join(', '), yPosition);
  }
  yPosition = addField('Service Notes', data.serviceNotes, yPosition);
  yPosition += sectionSpacing;

  // References & Additional Info Section
  yPosition = checkNewPage(yPosition);
  yPosition = addSectionHeader('References & Additional Information', yPosition);
  yPosition = addField('LinkedIn', data.linkedin || '', yPosition);
  yPosition = addField('Reference 1', data.reference1 || '', yPosition);
  yPosition = addField('Reference 2', data.reference2 || '', yPosition);
  yPosition = addField('How did you hear about us?', data.heardFrom, yPosition);
  yPosition = addField('Computed Score', data.computedScore, yPosition);
  yPosition = addField('Computed Tier', data.computedTier, yPosition);
  yPosition = addField('Submitted At', data.submittedAt, yPosition);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated by OneShopCentrale System`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  return doc.output('arraybuffer') as Uint8Array;
}

/**
 * Sends vendor form data as PDF attachment via email
 */
export async function sendDistributorEmail(data: DistributorIntakeData): Promise<EmailResult> {
  try {
    // Generate PDF
    const pdfBuffer = generateDistributorPDF(data);
    
    // Convert Uint8Array to base64 for email attachment
    // Create a Blob from the Uint8Array and convert to base64
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const base64Pdf = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (data:application/pdf;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
    
    // Debug: Check if base64 content is valid
    console.log('PDF buffer length:', pdfBuffer.length);
    console.log('Base64 length:', base64Pdf.length);
    console.log('Base64 preview:', base64Pdf.substring(0, 50) + '...');
    
    // Prepare email content
    const emailSubject = `New Vendor Application - ${data.company || 'Unknown Company'}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          New Vendor Application Received
        </h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Company Details:</h3>
          <p><strong>Company:</strong> ${data.company || 'Not provided'}</p>
          <p><strong>Contact Person:</strong> ${data.contact || 'Not provided'}</p>
          <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          <p><strong>Product:</strong> ${data.productName || 'Not provided'}</p>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #065f46;">
            <strong>📎 Complete application details are attached as a PDF document.</strong>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>This email was automatically generated by the OneShopCentrale vendor onboarding system.</p>
          <p>Submitted on: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}</p>
        </div>
      </div>
    `;

    // Send email via Resend API proxy
    const response = await fetch('/api/resend/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: emailSubject,
        html: emailBody,
        attachments: [
          {
            filename: `vendor-application-${data.company?.replace(/[^a-zA-Z0-9]/g, '-') || 'unknown'}-${Date.now()}.pdf`,
            content: base64Pdf,
            content_type: 'application/pdf',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Vendor application sent successfully to admin',
      emailId: result?.id,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    
    let errorMessage = 'Failed to send vendor application email';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Validates form data before sending
 */
export function validateDistributorData(data: Partial<DistributorIntakeData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields validation
  if (!data.company?.trim()) errors.push('Company name is required');
  if (!data.firstName?.trim() || !data.lastName?.trim()) errors.push('Contact person name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.productName?.trim()) errors.push('Product name is required');
  if (!data.signature?.trim()) errors.push('Signature is required');
  
  // Email format validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Array fields validation
  if (!data.businessType?.length) errors.push('At least one business type must be selected');
  if (!data.productCategory?.length) errors.push('At least one product category must be selected');
  if (!data.targetMarket?.length) errors.push('At least one target market must be selected');
  if (!data.models?.length) errors.push('At least one pricing model must be selected');
  if (!data.tiers?.length) errors.push('At least one store tier must be selected');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}