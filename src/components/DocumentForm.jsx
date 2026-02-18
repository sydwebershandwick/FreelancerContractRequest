import React, { useState, useEffect } from 'react';
import '../styles/DocumentForm.css';

// Configuration - Use secure API proxy endpoint
const API_ENDPOINT = '/api/submit';
const CONFIG_ENDPOINT = '/api/config';

// Offerings by Agency
const OFFERINGS_BY_AGENCY = {
  'Vocal Content': [
    'Vocal Content',
    'Internal Jobs'
  ],
  'Jack Morton': [
    'Branding and Design',
    'Event Management and Activation',
    'Strategy Development',
    'Internal Jobs'
  ],
  'Weber Shandwick': [
    'Advertising and Content Marketing',
    'Branding and Design',
    'Community and Stakeholder Engagement',
    'Digital Marketing',
    'Event Management & Activation',
    'Integrated MarComms',
    'Media Planning and Management',
    'PR and Communications',
    'Strategy Development',
    'Internal Jobs'
  ]
};

const DocumentForm = () => {
  const [formData, setFormData] = useState({
    submissionType: 'New',
    agency: '',
    offering: '',
    jobNumber: '',
    client: '',
    currency: 'AUD',
    persuasiveEvidence: '',
    purchaseOrderNumber: '',
    purchaseOrderAmount: '',
    purchaseOrderFile: null,
    statementOfWorkId: '',
    statementOfWorkAmount: '',
    statementOfWorkFile: null,
    contractId: '',
    contractAmount: '',
    contractFile: null,
    letterOfIntentAmount: '',
    letterOfIntentFile: null,
    emailAmount: '',
    emailFile: null,
    thirdPartyMarkup: '0',
    thirdPartyCostsBase: '',
    thirdPartyCosts: '',
    fee: '',
    invoiceSchedule: [{ description: '', date: '', amount: '' }]
  });
  const [errors, setErrors] = useState({});
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [amountValidation, setAmountValidation] = useState({
    isValid: true,
    errorMessage: ''
  });

  // Check authorization based on URL parameter
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Development mode - bypass SharePoint auth when running locally
        const isDevelopment = window.location.hostname === 'localhost' ||
                            window.location.hostname === '127.0.0.1';

        if (isDevelopment) {
          console.log('Development mode - bypassing SharePoint authentication');
          setAuthToken('1f34ab3575caa4e2e5e749209be888e8c656db9adac4e5f85bf646866806bb9e');
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Production mode - require SharePoint key
        const urlParams = new URLSearchParams(window.location.search);
        const spKey = urlParams.get('spkey');

        if (!spKey) {
          console.log('No SharePoint key provided');
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Use dedicated SharePoint access key (separate from auth token)
        const validSpKey = '0e60e3122232c789c9785b574242c8fed8ff814dfa6376c9e94f0ae230021d2b';

        if (spKey === validSpKey) {
          // If SharePoint key is valid, set the real auth token
          setAuthToken('1f34ab3575caa4e2e5e749209be888e8c656db9adac4e5f85bf646866806bb9e');
          setIsAuthorized(true);
          console.log('Form authorized via SharePoint key');
        } else {
          setIsAuthorized(false);
          console.log('Invalid SharePoint key');
        }
      } catch (error) {
        console.error('Authorization check failed:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If agency changes, clear the offering selection
    if (name === 'agency') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        offering: ''
      }));
      // Clear offering error if it exists
      if (errors.offering) {
        setErrors(prev => ({
          ...prev,
          offering: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle 3rd party markup percentage changes
  const handleMarkupChange = (e) => {
    const { value } = e.target;

    // Only allow valid number characters
    if (value && !/^\d*\.?\d{0,2}$/.test(value)) {
      return;
    }

    const markupPercent = parseFloat(value) || 0;

    setFormData(prev => {
      const base = parseFloat(prev.thirdPartyCostsBase) || 0;
      const newThirdPartyCosts = base * (1 + markupPercent / 100);

      // Determine which amount field we're working with
      const amountFieldName = formData.persuasiveEvidence === 'Purchase Order' ? 'purchaseOrderAmount' :
                             formData.persuasiveEvidence === 'Statement of Work' ? 'statementOfWorkAmount' :
                             formData.persuasiveEvidence === 'Contract' ? 'contractAmount' :
                             formData.persuasiveEvidence === 'Letter of intent' ? 'letterOfIntentAmount' :
                             formData.persuasiveEvidence === 'Email confirmation' ? 'emailAmount' : '';

      const currentAmount = parseFloat(prev[amountFieldName]) || 0;
      const newFee = currentAmount - newThirdPartyCosts;

      return {
        ...prev,
        thirdPartyMarkup: value,
        thirdPartyCosts: newThirdPartyCosts.toFixed(2),
        fee: newFee >= 0 ? newFee.toFixed(2) : prev.fee
      };
    });

    // Clear error when user starts typing
    if (errors.thirdPartyMarkup) {
      setErrors(prev => ({
        ...prev,
        thirdPartyMarkup: ''
      }));
    }
  };

  // Handle amount fields changes
  const handleAmountFieldChange = (e) => {
    const { name, value } = e.target;
    // Remove commas for calculation
    const cleanValue = value.replace(/,/g, '');

    // Only allow valid number characters
    if (cleanValue && !/^\d*\.?\d{0,2}$/.test(cleanValue)) {
      return;
    }

    const numValue = parseFloat(cleanValue) || 0;

    // Format with commas as user types
    let formattedValue = cleanValue;
    if (cleanValue && !isNaN(cleanValue)) {
      const parts = cleanValue.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formattedValue = parts.join('.');
    }

    // Update the input display
    e.target.value = formattedValue;

    setFormData(prev => {
      const newData = { ...prev, [name]: cleanValue };
      
      // Determine which amount field we're working with
      const amountFieldName = formData.persuasiveEvidence === 'Purchase Order' ? 'purchaseOrderAmount' :
                             formData.persuasiveEvidence === 'Statement of Work' ? 'statementOfWorkAmount' :
                             formData.persuasiveEvidence === 'Contract' ? 'contractAmount' :
                             formData.persuasiveEvidence === 'Letter of intent' ? 'letterOfIntentAmount' :
                             formData.persuasiveEvidence === 'Email confirmation' ? 'emailAmount' : '';
      
      // Handle amount field changes - reset fee to equal amount, 3rd party costs to zero
      if (name === amountFieldName && amountFieldName) {
        newData.fee = numValue.toFixed(2);
        newData.thirdPartyCosts = '0.00';
        newData.thirdPartyCostsBase = '0.00';
        newData.thirdPartyMarkup = '0';

        // Validate against invoice total
        if (numValue > invoiceTotal && invoiceTotal > 0) {
          const difference = (numValue - invoiceTotal).toFixed(2);
          setAmountValidation({
            isValid: false,
            errorMessage: `Persuasive Evidence Amount ($${numValue.toFixed(2)}) exceeds Invoice Schedule Total ($${invoiceTotal.toFixed(2)}) by $${difference}. Add more invoice lines to match.`
          });
        } else if (Math.abs(numValue - invoiceTotal) > 0.01 && invoiceTotal > 0) {
          const shortage = (invoiceTotal - numValue).toFixed(2);
          setAmountValidation({
            isValid: false,
            errorMessage: `Invoice Schedule Total ($${invoiceTotal.toFixed(2)}) exceeds Persuasive Evidence Amount ($${numValue.toFixed(2)}) by $${shortage}. Reduce invoice amounts to match.`
          });
        } else {
          setAmountValidation({
            isValid: true,
            errorMessage: ''
          });
        }
      }
      // Handle fee changes - maintain constraint: Fee + 3rd Party Costs = Amount
      else if (name === 'fee') {
        const currentAmount = parseFloat(prev[amountFieldName]) || 0;
        const newThirdPartyCosts = currentAmount - numValue;
        
        // Check for negative values
        if (numValue < 0) {
          setAmountValidation({
            isValid: false,
            errorMessage: `Fee cannot be negative. Current Fee: $${numValue.toFixed(2)}`
          });
        } else if (newThirdPartyCosts < 0) {
          setAmountValidation({
            isValid: false,
            errorMessage: `3rd Party Costs cannot be negative. With Fee $${numValue.toFixed(2)}, 3rd Party Costs would be $${newThirdPartyCosts.toFixed(2)}`
          });
        } else {
          newData.thirdPartyCosts = newThirdPartyCosts.toFixed(2);
          setAmountValidation({
            isValid: true,
            errorMessage: ''
          });
        }
      }
      // Handle 3rd party costs changes - maintain constraint: Fee + 3rd Party Costs = Amount
      else if (name === 'thirdPartyCosts') {
        const currentAmount = parseFloat(prev[amountFieldName]) || 0;
        const newFee = currentAmount - numValue;

        // Store as base cost and reset markup to 0 when manually edited
        newData.thirdPartyCostsBase = cleanValue;
        newData.thirdPartyMarkup = '0';

        // Check for negative values
        if (numValue < 0) {
          setAmountValidation({
            isValid: false,
            errorMessage: `3rd Party Costs cannot be negative. Current 3rd Party Costs: $${numValue.toFixed(2)}`
          });
        } else if (newFee < 0) {
          setAmountValidation({
            isValid: false,
            errorMessage: `Fee cannot be negative. With 3rd Party Costs $${numValue.toFixed(2)}, Fee would be $${newFee.toFixed(2)}`
          });
        } else {
          newData.fee = newFee.toFixed(2);
          setAmountValidation({
            isValid: true,
            errorMessage: ''
          });
        }
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Format amount field to show .00 on blur and add commas for display
  const handleAmountBlur = (e) => {
    const { name, value } = e.target;
    if (value && !isNaN(value)) {
      const numValue = parseFloat(value);
      const formattedValue = numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      e.target.value = formattedValue;
      // Store the numeric value without commas for calculations
      setFormData(prev => ({
        ...prev,
        [name]: numValue.toFixed(2)
      }));
    }
  };

  // Prevent arrow keys from changing number values
  const handleNumberKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Prevent scroll wheel from changing number values
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.target.blur(); // Remove focus to prevent any further wheel interaction
  };

  // Additional protection against any programmatic value changes
  const handleInputProtection = (e) => {
    // Store the current value to prevent unauthorized changes
    const currentValue = e.target.value;
    setTimeout(() => {
      // Ensure the value hasn't been changed by wheel or other automated means
      if (e.target.value !== currentValue && document.activeElement !== e.target) {
        // Restore the value if it was changed programmatically
        e.target.value = currentValue;
      }
    }, 0);
  };

  const handleInvoiceLineChange = (index, field, value) => {
    const newSchedule = [...formData.invoiceSchedule];
    // Remove commas from amount field
    if (field === 'amount') {
      const cleanValue = value.replace(/,/g, '');

      // Only allow valid number characters
      if (cleanValue && !/^\d*\.?\d{0,2}$/.test(cleanValue)) {
        return;
      }

      newSchedule[index][field] = cleanValue;
    } else {
      newSchedule[index][field] = value;
    }
    setFormData(prev => ({
      ...prev,
      invoiceSchedule: newSchedule
    }));
  };

  // Format invoice line amount to show .00 on blur and add commas for display
  const handleInvoiceAmountBlur = (index) => {
    const newSchedule = [...formData.invoiceSchedule];
    if (newSchedule[index].amount && !isNaN(newSchedule[index].amount)) {
      const numValue = parseFloat(newSchedule[index].amount);
      newSchedule[index].amount = numValue.toFixed(2);
      setFormData(prev => ({
        ...prev,
        invoiceSchedule: newSchedule
      }));
    }
  };

  const addInvoiceLine = () => {
    setFormData(prev => ({
      ...prev,
      invoiceSchedule: [...prev.invoiceSchedule, { description: '', date: '', amount: '' }]
    }));
  };

  const removeInvoiceLine = (index) => {
    if (formData.invoiceSchedule.length > 1) {
      const newSchedule = formData.invoiceSchedule.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        invoiceSchedule: newSchedule
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const fieldName = e.target.name;
    setFormData(prev => ({
      ...prev,
      [fieldName]: file
    }));
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Determine which file field to update based on persuasive evidence type
      let fieldName = 'purchaseOrderFile';
      if (formData.persuasiveEvidence === 'Statement of Work') {
        fieldName = 'statementOfWorkFile';
      } else if (formData.persuasiveEvidence === 'Contract') {
        fieldName = 'contractFile';
      } else if (formData.persuasiveEvidence === 'Letter of intent') {
        fieldName = 'letterOfIntentFile';
      } else if (formData.persuasiveEvidence === 'Email confirmation') {
        fieldName = 'emailFile';
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
      if (errors[fieldName]) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: ''
        }));
      }
    }
  };

  useEffect(() => {
    const total = formData.invoiceSchedule.reduce((sum, line) => {
      const amount = parseFloat(line.amount) || 0;
      return sum + amount;
    }, 0);
    setInvoiceTotal(total);
  }, [formData.invoiceSchedule]);

  // Recalculate validation when invoice total or persuasive evidence changes
  useEffect(() => {
    if (formData.persuasiveEvidence) {
      const thirdPartyCosts = parseFloat(formData.thirdPartyCosts) || 0;
      const fee = parseFloat(formData.fee) || 0;
      
      // Determine which amount field we're working with
      const amountFieldName = formData.persuasiveEvidence === 'Purchase Order' ? 'purchaseOrderAmount' :
                             formData.persuasiveEvidence === 'Statement of Work' ? 'statementOfWorkAmount' :
                             formData.persuasiveEvidence === 'Contract' ? 'contractAmount' :
                             formData.persuasiveEvidence === 'Letter of intent' ? 'letterOfIntentAmount' :
                             formData.persuasiveEvidence === 'Email confirmation' ? 'emailAmount' : '';
      
      const currentAmount = parseFloat(formData[amountFieldName]) || 0;
      const sumOfComponents = fee + thirdPartyCosts;
      
      // Validate the constraint: Amount = Fee + 3rd Party Costs
      if (fee < 0) {
        setAmountValidation({
          isValid: false,
          errorMessage: `Fee cannot be negative. Current Fee: $${fee.toFixed(2)}`
        });
      } else if (thirdPartyCosts < 0) {
        setAmountValidation({
          isValid: false,
          errorMessage: `3rd Party Costs cannot be negative. Current 3rd Party Costs: $${thirdPartyCosts.toFixed(2)}`
        });
      } else if (Math.abs(sumOfComponents - currentAmount) > 0.01 && currentAmount > 0) {
        setAmountValidation({
          isValid: false,
          errorMessage: `Constraint violation. Fee ($${fee.toFixed(2)}) + 3rd Party Costs ($${thirdPartyCosts.toFixed(2)}) = $${sumOfComponents.toFixed(2)} ≠ Amount ($${currentAmount.toFixed(2)})`
        });
      } else if (currentAmount > invoiceTotal && invoiceTotal > 0) {
        const difference = (currentAmount - invoiceTotal).toFixed(2);
        setAmountValidation({
          isValid: false,
          errorMessage: `Persuasive Evidence Amount ($${currentAmount.toFixed(2)}) exceeds Invoice Schedule Total ($${invoiceTotal.toFixed(2)}) by $${difference}. Add more invoice lines to match.`
        });
      } else if (Math.abs(currentAmount - invoiceTotal) > 0.01 && invoiceTotal > 0) {
        const shortage = (invoiceTotal - currentAmount).toFixed(2);
        setAmountValidation({
          isValid: false,
          errorMessage: `Invoice Schedule Total ($${invoiceTotal.toFixed(2)}) exceeds Persuasive Evidence Amount ($${currentAmount.toFixed(2)}) by $${shortage}. Reduce invoice amounts to match.`
        });
      } else {
        setAmountValidation({
          isValid: true,
          errorMessage: ''
        });
      }
    }
  }, [invoiceTotal, formData.persuasiveEvidence, formData.thirdPartyCosts, formData.fee, formData.purchaseOrderAmount, formData.statementOfWorkAmount, formData.contractAmount, formData.letterOfIntentAmount, formData.emailAmount]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.agency) {
      newErrors.agency = 'Agency is required';
    }
    if (!formData.offering) {
      newErrors.offering = 'Offering is required';
    }
    if (!formData.jobNumber.trim()) {
      newErrors.jobNumber = 'Job number is required';
    }
    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }
    if (!formData.persuasiveEvidence) {
      newErrors.persuasiveEvidence = 'Persuasive evidence type is required';
    }

    // Validate 3rd party costs and fee for any persuasive evidence
    if (formData.persuasiveEvidence) {
      if (!formData.thirdPartyCosts || isNaN(formData.thirdPartyCosts)) {
        newErrors.thirdPartyCosts = 'Valid 3rd party costs is required';
      }
      if (!formData.fee || isNaN(formData.fee)) {
        newErrors.fee = 'Valid fee is required';
      }
    }

    // Validate based on selected evidence type
    if (formData.persuasiveEvidence === 'Purchase Order') {
      if (!formData.purchaseOrderNumber.trim()) {
        newErrors.purchaseOrderNumber = 'Purchase order number is required';
      }
      if (!formData.purchaseOrderAmount || isNaN(formData.purchaseOrderAmount)) {
        newErrors.purchaseOrderAmount = 'Valid purchase order amount is required';
      }
      if (!formData.purchaseOrderFile) {
        newErrors.purchaseOrderFile = 'Purchase order file is required';
      }
      const poAmount = parseFloat(formData.purchaseOrderAmount) || 0;
      if (Math.abs(invoiceTotal - poAmount) > 0.01) {
        newErrors.invoiceTotal = 'Invoice schedule total must match purchase order amount';
      }
    } else if (formData.persuasiveEvidence === 'Statement of Work') {
      // Statement of Work ID is optional
      if (!formData.statementOfWorkAmount || isNaN(formData.statementOfWorkAmount)) {
        newErrors.statementOfWorkAmount = 'Valid statement of work amount is required';
      }
      if (!formData.statementOfWorkFile) {
        newErrors.statementOfWorkFile = 'Statement of work file is required';
      }
      const sowAmount = parseFloat(formData.statementOfWorkAmount) || 0;
      if (Math.abs(invoiceTotal - sowAmount) > 0.01) {
        newErrors.invoiceTotal = 'Invoice schedule total must match statement of work amount';
      }
    } else if (formData.persuasiveEvidence === 'Contract') {
      // Contract ID is optional
      if (!formData.contractAmount || isNaN(formData.contractAmount)) {
        newErrors.contractAmount = 'Valid contract amount is required';
      }
      if (!formData.contractFile) {
        newErrors.contractFile = 'Contract file is required';
      }
      const contractAmount = parseFloat(formData.contractAmount) || 0;
      if (Math.abs(invoiceTotal - contractAmount) > 0.01) {
        newErrors.invoiceTotal = 'Invoice schedule total must match contract amount';
      }
    } else if (formData.persuasiveEvidence === 'Letter of intent') {
      if (!formData.letterOfIntentAmount || isNaN(formData.letterOfIntentAmount)) {
        newErrors.letterOfIntentAmount = 'Valid letter of intent amount is required';
      }
      if (!formData.letterOfIntentFile) {
        newErrors.letterOfIntentFile = 'Letter of intent file is required';
      }
      const loiAmount = parseFloat(formData.letterOfIntentAmount) || 0;
      if (Math.abs(invoiceTotal - loiAmount) > 0.01) {
        newErrors.invoiceTotal = 'Invoice schedule total must match letter of intent amount';
      }
    } else if (formData.persuasiveEvidence === 'Email confirmation') {
      if (!formData.emailAmount || isNaN(formData.emailAmount)) {
        newErrors.emailAmount = 'Valid email amount is required';
      }
      if (!formData.emailFile) {
        newErrors.emailFile = 'Email confirmation file is required';
      }
      const emailAmount = parseFloat(formData.emailAmount) || 0;
      if (Math.abs(invoiceTotal - emailAmount) > 0.01) {
        newErrors.invoiceTotal = 'Invoice schedule total must match email amount';
      }
    }
    
    formData.invoiceSchedule.forEach((line, index) => {
      if (!line.description.trim()) {
        newErrors[`invoiceDescription${index}`] = 'Description is required';
      }
      if (!line.date) {
        newErrors[`invoiceDate${index}`] = 'Date is required';
      }
      if (!line.amount || isNaN(line.amount)) {
        newErrors[`invoiceAmount${index}`] = 'Valid amount is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check amount validation before form validation
    if (!amountValidation.isValid && invoiceTotal > 0) {
      alert('Please fix the amount validation errors before submitting.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Determine which file to use based on evidence type
      let fileToUpload, fileName, fileSize, fileType;
      let documentAmount = 0;

      if (formData.persuasiveEvidence === 'Purchase Order') {
        fileToUpload = formData.purchaseOrderFile;
        documentAmount = parseFloat(formData.purchaseOrderAmount);
      } else if (formData.persuasiveEvidence === 'Statement of Work') {
        fileToUpload = formData.statementOfWorkFile;
        documentAmount = parseFloat(formData.statementOfWorkAmount);
      } else if (formData.persuasiveEvidence === 'Contract') {
        fileToUpload = formData.contractFile;
        documentAmount = parseFloat(formData.contractAmount);
      } else if (formData.persuasiveEvidence === 'Letter of intent') {
        fileToUpload = formData.letterOfIntentFile;
        documentAmount = parseFloat(formData.letterOfIntentAmount);
      } else if (formData.persuasiveEvidence === 'Email confirmation') {
        fileToUpload = formData.emailFile;
        documentAmount = parseFloat(formData.emailAmount);
      }

      const fileBase64 = await fileToBase64(fileToUpload);
      fileName = fileToUpload.name;
      fileSize = fileToUpload.size;
      fileType = fileToUpload.type;

      // Prepare payload for Power Automate
      const payload = {
        submissionType: formData.submissionType,
        agency: formData.agency,
        offering: formData.offering,
        jobNumber: formData.jobNumber.trim(),
        client: formData.client.trim(),
        currency: formData.currency,
        persuasiveEvidence: formData.persuasiveEvidence,
        purchaseOrderNumber: formData.purchaseOrderNumber.trim(),
        purchaseOrderAmount: formData.persuasiveEvidence === 'Purchase Order' ? Math.round(parseFloat(formData.purchaseOrderAmount) * 100) : null,
        statementOfWorkId: formData.statementOfWorkId.trim(),
        statementOfWorkAmount: formData.persuasiveEvidence === 'Statement of Work' ? Math.round(parseFloat(formData.statementOfWorkAmount) * 100) : null,
        contractId: formData.contractId.trim(),
        contractAmount: formData.persuasiveEvidence === 'Contract' ? Math.round(parseFloat(formData.contractAmount) * 100) : null,
        letterOfIntentAmount: formData.persuasiveEvidence === 'Letter of intent' ? Math.round(parseFloat(formData.letterOfIntentAmount) * 100) : null,
        emailAmount: formData.persuasiveEvidence === 'Email confirmation' ? Math.round(parseFloat(formData.emailAmount) * 100) : null,
        documentFileName: fileName,
        documentFileSize: fileSize,
        documentFileType: fileType,
        documentFileContent: fileBase64,
        thirdPartyMarkup: formData.thirdPartyMarkup,
        thirdPartyCosts: Math.round(parseFloat(formData.thirdPartyCosts) * 100), // Convert to cents
        fee: Math.round(parseFloat(formData.fee) * 100), // Convert to cents
        invoiceSchedule: formData.invoiceSchedule.map(line => ({
          date: line.date,
          description: line.description.trim(),
          amount: Math.round(parseFloat(line.amount) * 100) // Convert to cents
        })),
        invoiceTotal: Math.round(invoiceTotal * 100), // Convert to cents
        submittedAt: new Date().toISOString()
      };

      // Send to Power Automate with auth token
      if (!authToken) {
        console.error('No auth token available');
        alert('Authentication error. Please refresh the page and try again.');
        setIsSubmitting(false);
        return;
      }
      console.log('Using auth token from API');
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Form-Token': authToken,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Reset form
      setFormData({
        submissionType: 'New',
        agency: '',
        offering: '',
        jobNumber: '',
        client: '',
        currency: 'AUD',
        persuasiveEvidence: '',
        purchaseOrderNumber: '',
        purchaseOrderAmount: '',
        purchaseOrderFile: null,
        statementOfWorkId: '',
        statementOfWorkAmount: '',
        statementOfWorkFile: null,
        contractId: '',
        contractAmount: '',
        contractFile: null,
        letterOfIntentAmount: '',
        letterOfIntentFile: null,
        emailAmount: '',
        emailFile: null,
        thirdPartyMarkup: '0',
        thirdPartyCostsBase: '',
        thirdPartyCosts: '',
        fee: '',
        invoiceSchedule: [{ description: '', date: '', amount: '' }]
      });
      // Reset file input
      const fileInput = document.getElementById('purchaseOrderFile');
      if (fileInput) fileInput.value = '';
      setErrors({});
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="document-form">
        <p style={{ textAlign: 'center', padding: '20px' }}>Loading...</p>
      </div>
    );
  }

  // Show unauthorized message if not from SharePoint
  if (!isAuthorized) {
    return (
      <div className="document-form">
        <h1>Access Restricted</h1>
        <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          This form is only available through the SharePoint portal.
          Please access it from the authorized SharePoint page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="document-form">
      <div className="form-header">
        <h1>Job Sold Form</h1>
        <div className="submission-type-container">
          <select
            id="submissionType"
            name="submissionType"
            value={formData.submissionType}
            onChange={handleChange}
            className="submission-type-select"
          >
            <option value="New">New</option>
            <option value="Revision">Revision</option>
          </select>
        </div>
      </div>

      {showSuccess && (
        <div className="success-message">
          Form submitted successfully!
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="agency" className="form-label">
          Agency *
        </label>
        <select
          id="agency"
          name="agency"
          value={formData.agency}
          onChange={handleChange}
          className={`form-input ${errors.agency ? 'error' : ''}`}
        >
          <option value="">Select agency</option>
          <option value="Jack Morton">Jack Morton</option>
          <option value="Weber Shandwick">Weber Shandwick</option>
          <option value="Vocal Content">Vocal Content</option>
        </select>
        {errors.agency && <span className="error-message">{errors.agency}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="offering" className="form-label">
          Offering *
        </label>
        <select
          id="offering"
          name="offering"
          value={formData.offering}
          onChange={handleChange}
          className={`form-input ${errors.offering ? 'error' : ''}`}
          disabled={!formData.agency}
        >
          <option value="">Select offering</option>
          {formData.agency && OFFERINGS_BY_AGENCY[formData.agency]?.map(offering => (
            <option key={offering} value={offering}>
              {offering}
            </option>
          ))}
        </select>
        {errors.offering && <span className="error-message">{errors.offering}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="jobNumber" className="form-label">
          Job Number *
        </label>
        <input
          type="text"
          id="jobNumber"
          name="jobNumber"
          value={formData.jobNumber}
          onChange={handleChange}
          className={`form-input ${errors.jobNumber ? 'error' : ''}`}
          placeholder="Enter job number"
        />
        {errors.jobNumber && <span className="error-message">{errors.jobNumber}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="client" className="form-label">
          Client
        </label>
        <input
          type="text"
          id="client"
          name="client"
          value={formData.client}
          onChange={handleChange}
          className={`form-input ${errors.client ? 'error' : ''}`}
          placeholder="Enter client name"
        />
        {errors.client && <span className="error-message">{errors.client}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="currency" className="form-label">
          Currency *
        </label>
        <select
          id="currency"
          name="currency"
          value={formData.currency}
          onChange={handleChange}
          className={`form-input ${errors.currency ? 'error' : ''}`}
        >
          <option value="AUD">AUD - Australian Dollar</option>
          <option value="NZD">NZD - New Zealand Dollar</option>
          <option value="USD">USD - US Dollar</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="EUR">EUR - Euro</option>
          <option value="SGD">SGD - Singapore Dollar</option>
        </select>
        {errors.currency && <span className="error-message">{errors.currency}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="persuasiveEvidence" className="form-label">
          Persuasive Evidence *
        </label>
        <select
          id="persuasiveEvidence"
          name="persuasiveEvidence"
          value={formData.persuasiveEvidence}
          onChange={handleChange}
          className={`form-input ${errors.persuasiveEvidence ? 'error' : ''}`}
        >
          <option value="">Select evidence type</option>
          <option value="Contract">Contract</option>
          <option value="Email confirmation">Email confirmation</option>
          <option value="Letter of intent">Letter of intent</option>
          <option value="Purchase Order">Purchase Order</option>
          <option value="Statement of Work">Statement of Work</option>
        </select>
        {errors.persuasiveEvidence && <span className="error-message">{errors.persuasiveEvidence}</span>}
      </div>

      {formData.persuasiveEvidence === 'Purchase Order' && (
        <>
          <div className="form-group">
            <label htmlFor="purchaseOrderNumber" className="form-label">
              Purchase Order Number *
            </label>
            <input
              type="text"
              id="purchaseOrderNumber"
              name="purchaseOrderNumber"
              value={formData.purchaseOrderNumber}
              onChange={handleChange}
              className={`form-input ${errors.purchaseOrderNumber ? 'error' : ''}`}
              placeholder="Enter PO number"
            />
            {errors.purchaseOrderNumber && <span className="error-message">{errors.purchaseOrderNumber}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="purchaseOrderAmount" className="form-label">
              Purchase Order Amount ({formData.currency}) *
            </label>
            <input
              type="text"
              id="purchaseOrderAmount"
              name="purchaseOrderAmount"
              value={(() => {
                const cleanValue = formData.purchaseOrderAmount;
                if (cleanValue && !isNaN(cleanValue)) {
                  const parts = cleanValue.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return parts.join('.');
                }
                return cleanValue;
              })()}
              onChange={handleAmountFieldChange}
              onBlur={handleAmountBlur}
              className={`form-input ${errors.purchaseOrderAmount ? 'error' : ''}`}
              placeholder="Enter PO amount"
            />
            {errors.purchaseOrderAmount && <span className="error-message">{errors.purchaseOrderAmount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="purchaseOrderFile" className="form-label">
              Upload Purchase Order *
            </label>
            <div
              className={`file-upload-container ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="purchaseOrderFile"
                name="purchaseOrderFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="file-input"
              />
              <p className="file-upload-text">
                <strong>Click to choose a file</strong> or drag and drop
                <br />
                <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</small>
              </p>
              {formData.purchaseOrderFile && (
                <div className="selected-file">
                  📄 {formData.purchaseOrderFile.name}
                </div>
              )}
            </div>
            {errors.purchaseOrderFile && <span className="error-message">{errors.purchaseOrderFile}</span>}
          </div>
        </>
      )}

      {formData.persuasiveEvidence === 'Statement of Work' && (
        <>
          <div className="form-group">
            <label htmlFor="statementOfWorkId" className="form-label">
              Statement of Work ID
            </label>
            <input
              type="text"
              id="statementOfWorkId"
              name="statementOfWorkId"
              value={formData.statementOfWorkId}
              onChange={handleChange}
              className={`form-input ${errors.statementOfWorkId ? 'error' : ''}`}
              placeholder="Enter SOW ID (optional)"
            />
            {errors.statementOfWorkId && <span className="error-message">{errors.statementOfWorkId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="statementOfWorkAmount" className="form-label">
              Statement of Work Amount ({formData.currency}) *
            </label>
            <input
              type="text"
              id="statementOfWorkAmount"
              name="statementOfWorkAmount"
              value={(() => {
                const cleanValue = formData.statementOfWorkAmount;
                if (cleanValue && !isNaN(cleanValue)) {
                  const parts = cleanValue.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return parts.join('.');
                }
                return cleanValue;
              })()}
              onChange={handleAmountFieldChange}
              onBlur={handleAmountBlur}
              className={`form-input ${errors.statementOfWorkAmount ? 'error' : ''}`}
              placeholder="Enter SOW amount"
            />
            {errors.statementOfWorkAmount && <span className="error-message">{errors.statementOfWorkAmount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="statementOfWorkFile" className="form-label">
              Upload Statement of Work *
            </label>
            <div
              className={`file-upload-container ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="statementOfWorkFile"
                name="statementOfWorkFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="file-input"
              />
              <p className="file-upload-text">
                <strong>Click to choose a file</strong> or drag and drop
                <br />
                <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</small>
              </p>
              {formData.statementOfWorkFile && (
                <div className="selected-file">
                  📄 {formData.statementOfWorkFile.name}
                </div>
              )}
            </div>
            {errors.statementOfWorkFile && <span className="error-message">{errors.statementOfWorkFile}</span>}
          </div>
        </>
      )}

      {formData.persuasiveEvidence === 'Contract' && (
        <>
          <div className="form-group">
            <label htmlFor="contractId" className="form-label">
              Contract ID
            </label>
            <input
              type="text"
              id="contractId"
              name="contractId"
              value={formData.contractId}
              onChange={handleChange}
              className={`form-input ${errors.contractId ? 'error' : ''}`}
              placeholder="Enter Contract ID (optional)"
            />
            {errors.contractId && <span className="error-message">{errors.contractId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contractAmount" className="form-label">
              Contract Amount ({formData.currency}) *
            </label>
            <input
              type="text"
              id="contractAmount"
              name="contractAmount"
              value={(() => {
                const cleanValue = formData.contractAmount;
                if (cleanValue && !isNaN(cleanValue)) {
                  const parts = cleanValue.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return parts.join('.');
                }
                return cleanValue;
              })()}
              onChange={handleAmountFieldChange}
              onBlur={handleAmountBlur}
              className={`form-input ${errors.contractAmount ? 'error' : ''}`}
              placeholder="Enter Contract amount"
            />
            {errors.contractAmount && <span className="error-message">{errors.contractAmount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contractFile" className="form-label">
              Upload Contract *
            </label>
            <div
              className={`file-upload-container ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="contractFile"
                name="contractFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="file-input"
              />
              <p className="file-upload-text">
                <strong>Click to choose a file</strong> or drag and drop
                <br />
                <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</small>
              </p>
              {formData.contractFile && (
                <div className="selected-file">
                  📄 {formData.contractFile.name}
                </div>
              )}
            </div>
            {errors.contractFile && <span className="error-message">{errors.contractFile}</span>}
          </div>
        </>
      )}

      {formData.persuasiveEvidence === 'Letter of intent' && (
        <>
          <div className="form-group">
            <label htmlFor="letterOfIntentAmount" className="form-label">
              Letter of intent amount ({formData.currency}) *
            </label>
            <input
              type="text"
              id="letterOfIntentAmount"
              name="letterOfIntentAmount"
              value={(() => {
                const cleanValue = formData.letterOfIntentAmount;
                if (cleanValue && !isNaN(cleanValue)) {
                  const parts = cleanValue.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return parts.join('.');
                }
                return cleanValue;
              })()}
              onChange={handleAmountFieldChange}
              onBlur={handleAmountBlur}
              className={`form-input ${errors.letterOfIntentAmount ? 'error' : ''}`}
              placeholder="Enter letter of intent amount"
            />
            {errors.letterOfIntentAmount && <span className="error-message">{errors.letterOfIntentAmount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="letterOfIntentFile" className="form-label">
              Upload Letter of intent *
            </label>
            <div
              className={`file-upload-container ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="letterOfIntentFile"
                name="letterOfIntentFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="file-input"
              />
              <p className="file-upload-text">
                <strong>Click to choose a file</strong> or drag and drop
                <br />
                <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</small>
              </p>
              {formData.letterOfIntentFile && (
                <div className="selected-file">
                  📄 {formData.letterOfIntentFile.name}
                </div>
              )}
            </div>
            {errors.letterOfIntentFile && <span className="error-message">{errors.letterOfIntentFile}</span>}
          </div>
        </>
      )}

      {formData.persuasiveEvidence === 'Email confirmation' && (
        <>
          <div className="form-group">
            <label htmlFor="emailAmount" className="form-label">
              Email amount ({formData.currency}) *
            </label>
            <input
              type="text"
              id="emailAmount"
              name="emailAmount"
              value={(() => {
                const cleanValue = formData.emailAmount;
                if (cleanValue && !isNaN(cleanValue)) {
                  const parts = cleanValue.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return parts.join('.');
                }
                return cleanValue;
              })()}
              onChange={handleAmountFieldChange}
              onBlur={handleAmountBlur}
              className={`form-input ${errors.emailAmount ? 'error' : ''}`}
              placeholder="Enter email amount"
            />
            {errors.emailAmount && <span className="error-message">{errors.emailAmount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="emailFile" className="form-label">
              Upload Email confirmation *
            </label>
            <div
              className={`file-upload-container ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="emailFile"
                name="emailFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="file-input"
              />
              <p className="file-upload-text">
                <strong>Click to choose a file</strong> or drag and drop
                <br />
                <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</small>
              </p>
              {formData.emailFile && (
                <div className="selected-file">
                  📄 {formData.emailFile.name}
                </div>
              )}
            </div>
            {errors.emailFile && <span className="error-message">{errors.emailFile}</span>}
          </div>
        </>
      )}

      {formData.persuasiveEvidence && (
        <>
          {!amountValidation.isValid && amountValidation.errorMessage && (
            <div className="amount-error-message">
              <span className="amount-error-icon">⚠️</span>
              <div>
                <strong>Amount Mismatch Error</strong>
                <div>{amountValidation.errorMessage}</div>
              </div>
            </div>
          )}

          <div className="third-party-row">
            <div className="form-group">
              <label htmlFor="thirdPartyCosts" className="form-label">
                3rd Party Costs ({formData.currency}) *
              </label>
              <input
                type="text"
                id="thirdPartyCosts"
                name="thirdPartyCosts"
                value={(() => {
                  const cleanValue = formData.thirdPartyCosts;
                  if (cleanValue && !isNaN(cleanValue)) {
                    const parts = cleanValue.split('.');
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    return parts.join('.');
                  }
                  return cleanValue;
                })()}
                onChange={handleAmountFieldChange}
                onBlur={handleAmountBlur}
                className={`form-input ${errors.thirdPartyCosts ? 'error' : ''} ${!amountValidation.isValid && invoiceTotal > 0 ? 'amount-error' : invoiceTotal > 0 && amountValidation.isValid ? 'amount-valid' : ''}`}
                placeholder="Enter 3rd party costs"
              />
              {errors.thirdPartyCosts && <span className="error-message">{errors.thirdPartyCosts}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="thirdPartyMarkup" className="form-label">
                3rd Party Mark up (%)
              </label>
              <div className="input-with-suffix">
                <input
                  type="text"
                  id="thirdPartyMarkup"
                  name="thirdPartyMarkup"
                  value={formData.thirdPartyMarkup}
                  onChange={handleMarkupChange}
                  className={`form-input ${errors.thirdPartyMarkup ? 'error' : ''}`}
                  placeholder="0"
                />
                <span className="input-suffix">%</span>
              </div>
              {errors.thirdPartyMarkup && <span className="error-message">{errors.thirdPartyMarkup}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fee" className="form-label">
              Fee ({formData.currency}) *
            </label>
            <input
              type="text"
              id="fee"
              name="fee"
              value={(() => {
                const cleanValue = formData.fee;
                if (cleanValue && !isNaN(cleanValue)) {
                  const parts = cleanValue.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return parts.join('.');
                }
                return cleanValue;
              })()}
              onChange={handleAmountFieldChange}
              onBlur={handleAmountBlur}
              className={`form-input ${errors.fee ? 'error' : ''} ${!amountValidation.isValid && invoiceTotal > 0 ? 'amount-error' : invoiceTotal > 0 && amountValidation.isValid ? 'amount-valid' : ''}`}
              placeholder="Enter fee"
            />
            {errors.fee && <span className="error-message">{errors.fee}</span>}
          </div>
        </>
      )}

      <div className="invoice-schedule-section">
        <h3>Invoice Schedule</h3>
        {formData.invoiceSchedule.map((line, index) => (
          <div key={index} className="invoice-line">
            <div className="invoice-line-fields">
              <div className="form-group invoice-date">
                <label className="form-label">
                  Date *
                </label>
                <input
                  type="date"
                  value={line.date}
                  onChange={(e) => handleInvoiceLineChange(index, 'date', e.target.value)}
                  className={`form-input ${errors[`invoiceDate${index}`] ? 'error' : ''}`}
                />
                {errors[`invoiceDate${index}`] && (
                  <span className="error-message">{errors[`invoiceDate${index}`]}</span>
                )}
              </div>
              <div className="form-group invoice-description">
                <label className="form-label">
                  Description *
                </label>
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => handleInvoiceLineChange(index, 'description', e.target.value)}
                  className={`form-input ${errors[`invoiceDescription${index}`] ? 'error' : ''}`}
                  placeholder="Enter description"
                />
                {errors[`invoiceDescription${index}`] && (
                  <span className="error-message">{errors[`invoiceDescription${index}`]}</span>
                )}
              </div>
              <div className="form-group invoice-amount">
                <label className="form-label">
                  Amount ({formData.currency}) *
                </label>
                <input
                  type="text"
                  value={(() => {
                    const cleanValue = line.amount;
                    if (cleanValue && !isNaN(cleanValue)) {
                      const parts = cleanValue.split('.');
                      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      return parts.join('.');
                    }
                    return cleanValue;
                  })()}
                  onChange={(e) => handleInvoiceLineChange(index, 'amount', e.target.value)}
                  onBlur={(e) => {
                    handleInvoiceAmountBlur(index);
                    // Add commas for display
                    if (e.target.value && !isNaN(e.target.value.replace(/,/g, ''))) {
                      const numValue = parseFloat(e.target.value.replace(/,/g, ''));
                      e.target.value = numValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      });
                    }
                  }}
                  className={`form-input ${errors[`invoiceAmount${index}`] ? 'error' : ''}`}
                  placeholder="0.00"
                />
                {errors[`invoiceAmount${index}`] && (
                  <span className="error-message">{errors[`invoiceAmount${index}`]}</span>
                )}
              </div>
              <div className="invoice-line-actions">
                {formData.invoiceSchedule.length > 1 && (
                  <button
                    type="button"
                    className="remove-line-button"
                    onClick={() => removeInvoiceLine(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <button
          type="button"
          className="add-line-button"
          onClick={addInvoiceLine}
        >
          Add Invoice Line
        </button>
        
        <div className="invoice-total">
          <div className="total-display">
            <strong>Invoice Total: {formData.currency} ${invoiceTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
            {((formData.persuasiveEvidence === 'Purchase Order' && formData.purchaseOrderAmount) ||
              (formData.persuasiveEvidence === 'Statement of Work' && formData.statementOfWorkAmount) ||
              (formData.persuasiveEvidence === 'Contract' && formData.contractAmount) ||
              (formData.persuasiveEvidence === 'Letter of intent' && formData.letterOfIntentAmount) ||
              (formData.persuasiveEvidence === 'Email confirmation' && formData.emailAmount)) && (
              <div className={`total-comparison ${
                Math.abs(invoiceTotal - parseFloat(
                  formData.persuasiveEvidence === 'Purchase Order' ? formData.purchaseOrderAmount :
                  formData.persuasiveEvidence === 'Statement of Work' ? formData.statementOfWorkAmount :
                  formData.persuasiveEvidence === 'Contract' ? formData.contractAmount :
                  formData.persuasiveEvidence === 'Letter of intent' ? formData.letterOfIntentAmount :
                  formData.emailAmount
                )) > 0.01 ? 'mismatch' : 'match'
              }`}>
                {formData.persuasiveEvidence === 'Purchase Order' ? 'PO' :
                 formData.persuasiveEvidence === 'Statement of Work' ? 'SOW' :
                 formData.persuasiveEvidence === 'Contract' ? 'Contract' :
                 formData.persuasiveEvidence === 'Letter of intent' ? 'LOI' :
                 'Email'} Amount: ${parseFloat(
                  formData.persuasiveEvidence === 'Purchase Order' ? (formData.purchaseOrderAmount || 0) :
                  formData.persuasiveEvidence === 'Statement of Work' ? (formData.statementOfWorkAmount || 0) :
                  formData.persuasiveEvidence === 'Contract' ? (formData.contractAmount || 0) :
                  formData.persuasiveEvidence === 'Letter of intent' ? (formData.letterOfIntentAmount || 0) :
                  (formData.emailAmount || 0)
                ).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            )}
          </div>
        </div>
        {errors.invoiceTotal && <span className="error-message">{errors.invoiceTotal}</span>}
      </div>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="loading"></span>
            Submitting...
          </>
        ) : (
          'Submit Job'
        )}
      </button>
    </form>
  );
};

export default DocumentForm;