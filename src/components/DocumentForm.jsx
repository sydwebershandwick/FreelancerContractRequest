import React, { useState, useEffect } from 'react';
import '../styles/DocumentForm.css';

// Configuration - Use secure API proxy endpoint
const API_ENDPOINT = '/api/submit';

const SUPER_RATE = 0.12; // 12% superannuation guarantee

// IT Setup manager name defaults per agency (editable on the form)
const AGENCY_MANAGERS = {
  'Jack Morton': 'Katrina King',
  'Weber Shandwick': 'Angela Malkin',
  'Vocal Content': 'Katrina King',
};

const DocumentForm = () => {
  const [formData, setFormData] = useState({
    submissionType: 'New',
    agency: '',
    firstName: '',
    surname: '',
    freelancerEmail: '',
    yourEmail: '',
    abn: '',
    companyType: '',
    companyName: '',
    workLocationState: '',
    rolePosition: '',
    duties: '',
    dayRate: '',
    hourlyRate: '',
    additionalRates: '',
    hideHourlyRateInContract: false,
    contractDate: '',
    startDate: '',
    endDate: '',
    manager: '',
    managerPhone: '',
    managerPosition: '',
    managerEmail: '',
    accessVault: false,
    accessTeams: false,
    accessEmailGroups: false,
  });
  const [errors, setErrors] = useState({});
  const [abnLookup, setAbnLookup] = useState({ loading: false, verified: false, entityName: '', entityTypeDescription: '', error: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authorization by validating spkey server-side
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const spKey = urlParams.get('spkey');

        if (!spKey) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/config?spkey=${encodeURIComponent(spKey)}`);

        if (!response.ok) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.authToken) {
          setAuthToken(data.authToken);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      // Auto-fill IT Setup manager name when agency changes (still editable).
      // Email is intentionally NOT linked to the manager — it's entered manually.
      if (name === 'agency') {
        updated.manager = AGENCY_MANAGERS[value] || '';
      }
      if (name === 'dayRate' && value) {
        const hourly = parseFloat(value) / 7.6;
        updated.hourlyRate = isNaN(hourly) ? '' : hourly.toFixed(2);
      }
      // Auto-untick "hide hourly rate" when dayRate is zero/empty AND additionalRates is blank
      if (name === 'dayRate' || name === 'additionalRates') {
        const dayRateVal = name === 'dayRate' ? value : prev.dayRate;
        const additionalVal = name === 'additionalRates' ? value : prev.additionalRates;
        const hasDayRate = dayRateVal && parseFloat(dayRateVal) > 0;
        const hasAdditional = additionalVal && additionalVal.trim() !== '';
        if (!hasDayRate && !hasAdditional) {
          updated.hideHourlyRateInContract = false;
        }
      }
      return updated;
    });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAbnBlur = async () => {
    const abn = formData.abn.replace(/\s/g, '');
    if (abn.length < 11) return;

    setAbnLookup({ loading: true, verified: false, entityName: '', entityTypeDescription: '', error: '' });
    try {
      const response = await fetch(`/api/abn-lookup?abn=${abn}`, {
        headers: { 'X-Form-Token': authToken },
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        const msg = response.status === 503
          ? 'ABN lookup unavailable — please fill in details manually'
          : (data.error || 'ABN not found — please fill in details manually');
        setAbnLookup({ loading: false, verified: false, entityName: '', entityTypeDescription: '', error: msg });
        return;
      }

      setAbnLookup({ loading: false, verified: true, entityName: data.entityName, entityTypeDescription: data.entityTypeDescription, error: '' });
      setFormData(prev => ({
        ...prev,
        companyType: data.companyType,
        companyName: data.companyType === 'Company' ? data.entityName : prev.companyName,
      }));
    } catch {
      setAbnLookup({ loading: false, verified: false, entityName: '', entityTypeDescription: '', error: 'ABN lookup unavailable — please fill in details manually' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.agency) newErrors.agency = 'Agency is required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.surname.trim()) newErrors.surname = 'Surname is required';
    if (!formData.freelancerEmail.trim()) {
      newErrors.freelancerEmail = 'Freelancer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.freelancerEmail)) {
      newErrors.freelancerEmail = 'Enter a valid email address';
    }
    if (!formData.yourEmail.trim()) {
      newErrors.yourEmail = 'Your email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.yourEmail)) {
      newErrors.yourEmail = 'Enter a valid email address';
    }
    if (!formData.abn.trim()) newErrors.abn = 'ABN is required';
    if (!formData.companyType) newErrors.companyType = 'Company type is required';
    if (formData.companyType === 'Company' && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.workLocationState) newErrors.workLocationState = 'Work location state is required';
    if (!formData.rolePosition.trim()) newErrors.rolePosition = 'Role / position is required';
    if (!formData.duties.trim()) newErrors.duties = 'Duties are required';
    if (!formData.hourlyRate || isNaN(formData.hourlyRate)) {
      newErrors.hourlyRate = 'Valid hourly rate is required';
    }
    if (!formData.contractDate) newErrors.contractDate = 'Contract date is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.managerPhone.trim() && !/^04\d{2}\s?\d{3}\s?\d{3}$/.test(formData.managerPhone.trim())) {
      newErrors.managerPhone = 'Enter a valid mobile number starting with 04';
    }
    if (formData.managerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.managerEmail)) {
      newErrors.managerEmail = 'Enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        submissionType: formData.submissionType,
        agency: formData.agency,
        firstName: formData.firstName.trim(),
        surname: formData.surname.trim(),
        freelancerEmail: formData.freelancerEmail.trim(),
        yourEmail: formData.yourEmail.trim(),
        abn: formData.abn.trim(),
        companyType: formData.companyType,
        companyName: formData.companyType === 'Company' ? formData.companyName.trim() : '',
        workLocationState: formData.workLocationState,
        rolePosition: formData.rolePosition.trim(),
        duties: formData.duties.trim(),
        dayRate: formData.dayRate ? parseFloat(formData.dayRate) : null,
        hourlyRate: parseFloat(formData.hourlyRate),
        additionalRates: formData.additionalRates.trim(),
        contractDate: formData.contractDate,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        hideHourlyRateInContract: formData.hideHourlyRateInContract,
        superApplicable: formData.companyType === 'Sole Trader',
        superRate: formData.companyType === 'Sole Trader' ? SUPER_RATE : null,
        manager: formData.manager.trim(),
        managerPhone: formData.managerPhone.trim(),
        managerPosition: formData.managerPosition.trim(),
        managerEmail: formData.managerEmail.trim(),
        accessRequired: [
          formData.accessVault && 'Vault',
          formData.accessTeams && 'Teams',
          formData.accessEmailGroups && 'Email groups',
        ].filter(Boolean),
        submittedAt: new Date().toISOString(),
      };

      if (!authToken) {
        alert('Authentication error. Please refresh the page and try again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Form-Token': authToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      let resultDraftUrl = '';
      try {
        const result = await response.json();
        resultDraftUrl = result.draftUrl || '';
      } catch {
        // Power Automate may not return JSON yet
      }

      setDraftUrl(resultDraftUrl);
      setShowSuccess(true);
      if (!resultDraftUrl) {
        setTimeout(() => setShowSuccess(false), 5000);
      }

      setFormData({
        submissionType: 'New',
        agency: '',
        firstName: '',
        surname: '',
        freelancerEmail: '',
        yourEmail: '',
        abn: '',
        companyType: '',
        companyName: '',
        workLocationState: '',
        rolePosition: '',
        duties: '',
        dayRate: '',
        hourlyRate: '',
        additionalRates: '',
        hideHourlyRateInContract: false,
        contractDate: '',
        startDate: '',
        endDate: '',
        manager: '',
        managerPhone: '',
        managerPosition: '',
        managerEmail: '',
        accessVault: false,
        accessTeams: false,
        accessEmailGroups: false,
      });
      setErrors({});
      setAbnLookup({ loading: false, verified: false, entityName: '', entityTypeDescription: '', error: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="document-form">
        <p style={{ textAlign: 'center', padding: '20px' }}>Loading...</p>
      </div>
    );
  }

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
        <h1>Freelancer Contract Request Form</h1>
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
          {draftUrl ? (
            <>
              Contract draft created successfully!{' '}
              <a href={draftUrl} target="_blank" rel="noopener noreferrer" className="draft-link">
                Open in Word Online to review
              </a>
            </>
          ) : (
            'Form submitted successfully!'
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="agency" className="form-label">Agency *</label>
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

      <div className="form-section-heading">Personal Information - Freelancer</div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName" className="form-label">First Name *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`form-input ${errors.firstName ? 'error' : ''}`}
            placeholder="First name"
          />
          {errors.firstName && <span className="error-message">{errors.firstName}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="surname" className="form-label">Surname *</label>
          <input
            type="text"
            id="surname"
            name="surname"
            value={formData.surname}
            onChange={handleChange}
            className={`form-input ${errors.surname ? 'error' : ''}`}
            placeholder="Surname"
          />
          {errors.surname && <span className="error-message">{errors.surname}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="freelancerEmail" className="form-label">
          Freelancer Email * <span className="form-hint">for signing contracts</span>
        </label>
        <input
          type="email"
          id="freelancerEmail"
          name="freelancerEmail"
          value={formData.freelancerEmail}
          onChange={handleChange}
          className={`form-input ${errors.freelancerEmail ? 'error' : ''}`}
          placeholder="firstname.lastname@example.com"
        />
        {errors.freelancerEmail && <span className="error-message">{errors.freelancerEmail}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="yourEmail" className="form-label">
          Your Email * <span className="form-hint">for teams/approval</span>
        </label>
        <input
          type="email"
          id="yourEmail"
          name="yourEmail"
          value={formData.yourEmail}
          onChange={handleChange}
          className={`form-input ${errors.yourEmail ? 'error' : ''}`}
          placeholder="you@agency.com"
        />
        {errors.yourEmail && <span className="error-message">{errors.yourEmail}</span>}
      </div>

      <div className="form-section-heading">Business Details</div>

      <div className="form-group">
        <label htmlFor="abn" className="form-label">
          ABN * <span className="form-hint">company, trust or sole trader ABN</span>
        </label>
        <div className="abn-input-row">
          <input
            type="text"
            id="abn"
            name="abn"
            value={formData.abn}
            onChange={handleChange}
            className={`form-input ${errors.abn ? 'error' : ''}`}
            placeholder="XX XXX XXX XXX"
          />
          <button
            type="button"
            className="abn-lookup-button"
            onClick={handleAbnBlur}
            disabled={abnLookup.loading || formData.abn.replace(/\s/g, '').length < 11}
          >
            {abnLookup.loading ? 'Looking up...' : 'Lookup ABN'}
          </button>
        </div>
        <span className="form-hint" style={{ display: 'block', marginTop: 5 }}>
          Click Lookup ABN to automatically fill in Company Type and Company Name from the Australian Business Register.
        </span>
        {errors.abn && <span className="error-message">{errors.abn}</span>}
        {abnLookup.verified && (
          <div className="abn-lookup-status abn-verified">
            ✓ {abnLookup.entityName} — {abnLookup.entityTypeDescription}
            {formData.companyType === 'Sole Trader' && (
              <span className="abn-copy-hint"> (copy name to First Name / Surname fields above)</span>
            )}
          </div>
        )}
        {abnLookup.error && (
          <div className="abn-lookup-status abn-error">
            <div>⚠ {abnLookup.error}</div>
            <div style={{ marginTop: 6 }}>
              You can look up the ABN manually at{' '}
              <a
                href="https://abr.business.gov.au/"
                target="_blank"
                rel="noopener noreferrer"
                className="abn-manual-link"
              >
                abr.business.gov.au
              </a>
              {' '}— then fill in Company Type and Company Name below yourself.
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="companyType" className="form-label">Company Type *</label>
        <select
          id="companyType"
          name="companyType"
          value={formData.companyType}
          onChange={handleChange}
          className={`form-input ${errors.companyType ? 'error' : ''}`}
        >
          <option value="">Select type</option>
          <option value="Company">Company</option>
          <option value="Sole Trader">Sole Trader</option>
        </select>
        {errors.companyType && <span className="error-message">{errors.companyType}</span>}
      </div>

      {formData.companyType === 'Company' && (
        <div className="form-group">
          <label htmlFor="companyName" className="form-label">Company Name *</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className={`form-input ${errors.companyName ? 'error' : ''}`}
            placeholder="Registered company name"
          />
          {errors.companyName && <span className="error-message">{errors.companyName}</span>}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="workLocationState" className="form-label">Work Location — State *</label>
        <select
          id="workLocationState"
          name="workLocationState"
          value={formData.workLocationState}
          onChange={handleChange}
          className={`form-input ${errors.workLocationState ? 'error' : ''}`}
        >
          <option value="">Select state</option>
          <option value="VIC">VIC</option>
          <option value="NSW">NSW</option>
          <option value="QLD">QLD</option>
          <option value="WA">WA</option>
          <option value="SA">SA</option>
          <option value="TAS">TAS</option>
          <option value="ACT">ACT</option>
          <option value="NT">NT</option>
        </select>
        {errors.workLocationState && <span className="error-message">{errors.workLocationState}</span>}
      </div>

      <div className="form-section-heading">Position &amp; Duties</div>

      <div className="form-group">
        <label htmlFor="rolePosition" className="form-label">
          Role / Position * <span className="form-hint">job title or function</span>
        </label>
        <input
          type="text"
          id="rolePosition"
          name="rolePosition"
          value={formData.rolePosition}
          onChange={handleChange}
          className={`form-input ${errors.rolePosition ? 'error' : ''}`}
          placeholder="e.g. Senior Copywriter"
        />
        {errors.rolePosition && <span className="error-message">{errors.rolePosition}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="duties" className="form-label">
          Duties * <span className="form-hint">work duties with frequency/schedule</span>
        </label>
        <textarea
          id="duties"
          name="duties"
          value={formData.duties}
          onChange={handleChange}
          className={`form-input form-textarea ${errors.duties ? 'error' : ''}`}
          placeholder="Describe the work duties, frequency and schedule..."
          rows={4}
        />
        {errors.duties && <span className="error-message">{errors.duties}</span>}
      </div>

      <div className="form-section-heading">Rates</div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dayRate" className="form-label">
            Day Rate excl. Super <span className="form-hint">optional</span>
          </label>
          <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
              type="number"
              id="dayRate"
              name="dayRate"
              value={formData.dayRate}
              onChange={handleChange}
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className={`form-group ${formData.hideHourlyRateInContract ? 'hourly-rate-shaded' : ''}`}>
          <label htmlFor="hourlyRate" className="form-label">
            Hourly Rate excl. Super * <span className="form-hint">calculated from day rate ÷ 7.6</span>
          </label>
          <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
              type="number"
              id="hourlyRate"
              name="hourlyRate"
              value={formData.hourlyRate}
              onChange={handleChange}
              className={`form-input ${errors.hourlyRate ? 'error' : ''}`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          {errors.hourlyRate && <span className="error-message">{errors.hourlyRate}</span>}
        </div>
      </div>

      <span className="form-hint" style={{ display: 'block', marginBottom: 12 }}>
        An hourly rate must always be entered. If a day rate or additional rates are used, you can hide the hourly rate from the contract. If there are Additional Rates/Conditions, these must be translated to an hourly rate manually.
      </span>

      {(parseFloat(formData.dayRate) > 0 || (formData.additionalRates && formData.additionalRates.trim() !== '')) && (
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="hideHourlyRateInContract"
              checked={formData.hideHourlyRateInContract}
              onChange={handleChange}
            />
            Don't display hourly rate in contract
          </label>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="additionalRates" className="form-label">
          Additional Rates / Conditions <span className="form-hint">optional</span>
        </label>
        <span className="form-hint" style={{ display: 'block', marginBottom: 6 }}>
          This section will show verbatim as typed here in the contract.
        </span>
        <textarea
          id="additionalRates"
          name="additionalRates"
          value={formData.additionalRates}
          onChange={handleChange}
          className="form-input form-textarea"
          placeholder="Any additional rates, conditions or notes..."
          rows={3}
        />
      </div>

  

      {formData.companyType === 'Sole Trader' && (parseFloat(formData.hourlyRate) > 0 || parseFloat(formData.dayRate) > 0) && (
        <div className="super-notice">
          <div className="super-notice-title">Super applicable ({(SUPER_RATE * 100).toFixed(0)}%)</div>
          {parseFloat(formData.hourlyRate) > 0 && (
            <div className="super-notice-row">
              <span>Hourly rate</span>
              <span>${parseFloat(formData.hourlyRate).toFixed(2)}/hr</span>
              <span>+ Super ${(parseFloat(formData.hourlyRate) * SUPER_RATE).toFixed(2)}/hr</span>
              <span className="super-total">= ${(parseFloat(formData.hourlyRate) * (1 + SUPER_RATE)).toFixed(2)}/hr total</span>
            </div>
          )}
          {parseFloat(formData.dayRate) > 0 && (
            <div className="super-notice-row">
              <span>Day rate</span>
              <span>${parseFloat(formData.dayRate).toFixed(2)}/day</span>
              <span>+ Super ${(parseFloat(formData.dayRate) * SUPER_RATE).toFixed(2)}/day</span>
              <span className="super-total">= ${(parseFloat(formData.dayRate) * (1 + SUPER_RATE)).toFixed(2)}/day total</span>
            </div>
          )}
        </div>
      )}

      <div className="form-section-heading">Dates</div>

      <div className="form-group">
        <label htmlFor="contractDate" className="form-label">
          Contract Date * 
        </label>
        <input
          type="date"
          id="contractDate"
          name="contractDate"
          value={formData.contractDate}
          onChange={handleChange}
          className={`form-input ${errors.contractDate ? 'error' : ''}`}
        />
        {errors.contractDate && <span className="error-message">{errors.contractDate}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate" className="form-label">Start Date *</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={`form-input ${errors.startDate ? 'error' : ''}`}
          />
          {errors.startDate && <span className="error-message">{errors.startDate}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="endDate" className="form-label">
            End Date <span className="form-hint">optional, defaults to 12 months</span>
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-section-heading">Contract Clause Preview</div>
      <div className="contract-preview">
        <table className="contract-table">
          <tbody>
            <tr className="contract-section-header">
              <td colSpan={2}>CONTRACTOR</td>
            </tr>
            <tr>
              <td className="contract-label">Name of Contractor (ABN)</td>
              <td className="contract-value">
                {formData.companyType === 'Company' && formData.companyName
                  ? formData.companyName
                  : (formData.firstName || formData.surname)
                    ? `${formData.firstName} ${formData.surname}`.trim()
                    : <span className="contract-placeholder">Name</span>
                }
                {' '}(ABN: {formData.abn.trim() || <span className="contract-placeholder">ABN</span>})
              </td>
            </tr>
            <tr className="contract-section-header">
              <td colSpan={2}>SERVICES</td>
            </tr>
            <tr>
              <td className="contract-label">Role / Position</td>
              <td className="contract-value">
                {formData.rolePosition.trim() || <span className="contract-placeholder">Role / Position</span>}
              </td>
            </tr>
            <tr className="contract-section-header">
              <td colSpan={2}>FEES</td>
            </tr>
            <tr>
              <td className="contract-label">Fees</td>
              <td className="contract-value">
                <div className="contract-fees">
                  {parseFloat(formData.dayRate) > 0 && (
                    <div className="contract-fee-line">
                      {formData.companyType === 'Sole Trader'
                        ? `$${(parseFloat(formData.dayRate) * (1 + SUPER_RATE)).toFixed(2)} per day (incl. Super)`
                        : `$${parseFloat(formData.dayRate).toFixed(2)} per day`
                      }
                    </div>
                  )}
                  {parseFloat(formData.hourlyRate) > 0 ? (
                    <div className={`contract-fee-line ${formData.hideHourlyRateInContract ? 'contract-fee-hidden' : ''}`}>
                      {formData.companyType === 'Sole Trader'
                        ? `$${(parseFloat(formData.hourlyRate) * (1 + SUPER_RATE)).toFixed(2)} per hour (incl. Super)`
                        : `$${parseFloat(formData.hourlyRate).toFixed(2)} per hour`
                      }
                      {formData.hideHourlyRateInContract && (
                        <span className="contract-hidden-tag">hidden in contract</span>
                      )}
                    </div>
                  ) : (
                    <div className="contract-fee-line">
                      <span className="contract-placeholder">Hourly rate</span>
                    </div>
                  )}
                  {formData.additionalRates.trim() && (
                    <div className="contract-fee-line contract-fee-additional">
                      {formData.additionalRates.trim()}
                    </div>
                  )}
                </div>
              </td>
            </tr>
            <tr className="contract-section-header">
              <td colSpan={2}>COMMENCEMENT</td>
            </tr>
            <tr>
              <td className="contract-label">Start and end Date</td>
              <td className="contract-value">
                {formData.startDate
                  ? new Date(formData.startDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : <span className="contract-placeholder">Start date</span>
                }
                {formData.endDate
                  ? <>{' '}to {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  : ', and is valid 12 months from the date of execution'
                }
              </td>
            </tr>
            <tr className="contract-section-header">
              <td colSpan={2}>GOVERNING LAW</td>
            </tr>
            <tr>
              <td className="contract-label">The State in which work will be done</td>
              <td className="contract-value">
                {formData.workLocationState || <span className="contract-placeholder">State</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="form-section-heading">IT Setup</div>

      <div className="form-group">
        <label htmlFor="manager" className="form-label">
          Manager Name <span className="form-hint">(for IT setup)</span>
        </label>
        <input
          type="text"
          id="manager"
          name="manager"
          value={formData.manager}
          onChange={handleChange}
          className="form-input"
          placeholder="Manager name"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="managerPhone" className="form-label">
            Phone <span className="form-hint">(for 2FA)</span>
          </label>
          <input
            type="tel"
            id="managerPhone"
            name="managerPhone"
            value={formData.managerPhone}
            onChange={handleChange}
            className={`form-input ${errors.managerPhone ? 'error' : ''}`}
            placeholder="04XX XXX XXX"
            inputMode="numeric"
          />
          {errors.managerPhone && <span className="error-message">{errors.managerPhone}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="managerPosition" className="form-label">
            Position <span className="form-hint">(for internal email)</span>
          </label>
          <input
            type="text"
            id="managerPosition"
            name="managerPosition"
            value={formData.managerPosition}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Account Director"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="managerEmail" className="form-label">
          Email <span className="form-hint">(external email to notify)</span>
        </label>
        <input
          type="email"
          id="managerEmail"
          name="managerEmail"
          value={formData.managerEmail}
          onChange={handleChange}
          className={`form-input ${errors.managerEmail ? 'error' : ''}`}
          placeholder="manager@agency.com.au"
        />
        {errors.managerEmail && <span className="error-message">{errors.managerEmail}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Access Required</label>
        <div className="access-checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="accessVault"
              checked={formData.accessVault}
              onChange={handleChange}
            />
            Vault
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="accessTeams"
              checked={formData.accessTeams}
              onChange={handleChange}
            />
            Teams
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="accessEmailGroups"
              checked={formData.accessEmailGroups}
              onChange={handleChange}
            />
            Email groups
          </label>
        </div>
      </div>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="loading"></span>
            Submitting...
          </>
        ) : (
          'Submit Request'
        )}
      </button>
    </form>
  );
};

export default DocumentForm;
