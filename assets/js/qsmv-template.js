(function () {
  const defaults = {
    clientName: 'PT Contoh Bisnis',
    policyNo: 'POL-2026-001',
    effectiveDate: '01 Juli 2026',
    status: 'Draft',
    cob: 'Marine',
    subCob: 'Marine Cargo',
    currency: 'IDR',
    premium: 'Rp 125.000.000',
    sumInsured: 'Rp 2.500.000.000',
    totalPremium: 'Rp 125.000.000',
    paymentTerm: 'Annual',
    paymentStatus: 'Pending',
    riskRows: [
      { item: 'Vessel / Cargo', description: 'Marine cargo coverage', value: 'Rp 2.500.000.000', note: 'Standard' },
      { item: 'Deductible', description: 'Own risk', value: 'Rp 25.000.000', note: 'Applicable' }
    ]
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value ?? '-';
    }
  }

  function renderTemplate(data = {}) {
    const payload = { ...defaults, ...data };
    setText('clientName', payload.clientName);
    setText('policyNo', payload.policyNo);
    setText('effectiveDate', payload.effectiveDate);
    setText('status', payload.status);
    setText('cob', payload.cob);
    setText('subCob', payload.subCob);
    setText('currency', payload.currency);
    setText('premium', payload.premium);
    setText('sumInsured', payload.sumInsured);
    setText('totalPremium', payload.totalPremium);
    setText('paymentTerm', payload.paymentTerm);
    setText('paymentStatus', payload.paymentStatus);

    const rows = document.getElementById('riskRows');
    if (rows) {
      if (Array.isArray(payload.riskRows) && payload.riskRows.length) {
        rows.innerHTML = payload.riskRows.map((row) => `
          <tr>
            <td>${row.item || '-'}</td>
            <td>${row.description || '-'}</td>
            <td>${row.value || '-'}</td>
            <td>${row.note || '-'}</td>
          </tr>
        `).join('');
      } else {
        rows.innerHTML = '<tr><td colspan="4" class="qsmv-muted">Belum ada data risiko.</td></tr>';
      }
    }
  }

  window.qsmvTemplate = {
    renderTemplate,
    loadFromApi: async function (endpoint = null) {
      const url = endpoint || 'http://localhost:3001/api/quotations';
      try {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Gagal mengambil data dari API');
        const payload = await response.json();
        const item = Array.isArray(payload?.data) ? payload.data[0] : payload;
        renderTemplate({
          clientName: item?.client_name || item?.client || 'PT Contoh Bisnis',
          policyNo: item?.policy_no || item?.policyNo || 'POL-2026-001',
          effectiveDate: item?.effective_date || item?.effectiveDate || '01 Juli 2026',
          status: item?.status || 'Draft',
          cob: item?.cob || 'Marine',
          subCob: item?.sub_cob || item?.subCob || 'Marine Cargo',
          currency: item?.currency || 'IDR',
          premium: item?.premium || item?.ins_premi || 'Rp 125.000.000',
          sumInsured: item?.sum_insured || item?.sumInsured || 'Rp 2.500.000.000',
          totalPremium: item?.total_premium || item?.totalPremium || 'Rp 125.000.000',
          paymentTerm: item?.payment_term || item?.paymentTerm || 'Annual',
          paymentStatus: item?.payment_status || item?.paymentStatus || 'Pending',
          riskRows: item?.riskRows || [
            { item: 'Risk Item', description: 'Detail', value: item?.premium || 'Rp 125.000.000', note: 'Auto' }
          ]
        });
      } catch (error) {
        console.warn('QSMV template API fallback used:', error);
        renderTemplate();
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderTemplate();
    window.qsmvTemplate.loadFromApi();
  });
})();
