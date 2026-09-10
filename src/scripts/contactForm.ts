// ============================================================================
// src/scripts/contactForm.ts
// お問い合わせフォームの非同期送信（Web3Forms / Fetch API）。
// #contact-form を持つページ（Contact.astro / contact.astro）で読み込むと
// 自動的に初期化される。アクセスキー・各種文言はサーバー側
// （siteInfo.yml → src/lib/site.ts）から <form> の data-* 属性で受け取る。
// ============================================================================
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  if (!form) return;

  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const labelEl = form.querySelector<HTMLElement>('.contact-submit-label');
  const successEl = document.getElementById('contact-success');
  const errorEl = document.getElementById('contact-error');

  const accessKey = form.dataset.accessKey ?? '';
  const submitLabel = form.dataset.submitLabel ?? labelEl?.textContent ?? '';
  const sendingLabel = form.dataset.sendingLabel ?? '';

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    // 標準のHTML5バリデーション（required / type=email）は活かす
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (errorEl) errorEl.hidden = true;
    if (submitBtn) submitBtn.disabled = true;
    if (labelEl && sendingLabel) labelEl.textContent = sendingLabel;

    try {
      const formData = new FormData(form);
      formData.append('access_key', accessKey);

      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };

      if (res.ok && data.success) {
        form.reset();
        form.hidden = true;
        if (errorEl) errorEl.hidden = true;
        if (successEl) successEl.hidden = false;
        return;
      }
      throw new Error('Web3Forms responded without success');
    } catch {
      if (errorEl) errorEl.hidden = false;
      if (submitBtn) submitBtn.disabled = false;
      if (labelEl && submitLabel) labelEl.textContent = submitLabel;
    }
  });
}

initContactForm();
