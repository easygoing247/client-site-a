// ============================================================================
// src/scripts/contactForm.ts
// お問い合わせフォームの非同期送信（Web3Forms / Fetch API）。
// #contact-form を持つページ（Contact.astro / contact.astro）で読み込むと
// 自動的に初期化される。アクセスキー・各種文言はサーバー側
// （siteInfo.yml の contactForm / contactSection.form → src/lib/site.ts）から
// <form> の data-* 属性で受け取る。成功／失敗メッセージは
// #contact-success / #contact-error を .is-visible クラスでフェードイン表示する
// （CSS は src/styles/global.css）。
// ============================================================================
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

function reveal(el: HTMLElement | null): void {
  if (!el) return;
  el.hidden = false;
  // display 復帰を一度レイアウトに反映させてから .is-visible を付けることで
  // CSSトランジション（opacity / transform）を確実に発火させる。
  // これは送信完了時の1回だけの処理のため、この強制リフローは許容範囲。
  void el.offsetWidth;
  el.classList.add('is-visible');
}

function hide(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.remove('is-visible');
  el.hidden = true;
}

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

    hide(errorEl);
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
        // 入力欄・送信ボタン・同意文を含む <form> 全体を確実に非表示にする。
        // form には Tailwind の .flex（display:flex）が付いており、これは
        // UAの [hidden]{display:none} より詳細度が高いため、hidden 属性だけでは
        // 消えない。inline style の display:none（最優先）で確実に隠し、
        // 併せて hidden 属性も付けてアクセシビリティツリーからも除外する。
        // （これにより「送信ボタンだけ『送信中...』のまま残る」不具合を解消）
        if (submitBtn) submitBtn.disabled = false;
        if (labelEl && submitLabel) labelEl.textContent = submitLabel;
        form.reset();
        form.hidden = true;
        form.style.display = 'none';
        hide(errorEl);
        reveal(successEl);
        return;
      }
      throw new Error('Web3Forms responded without success');
    } catch {
      // 送信失敗：送信ボタンの disabled を解除し、ラベルを元に戻してから
      // エラーメッセージを表示する。
      if (submitBtn) submitBtn.disabled = false;
      if (labelEl && submitLabel) labelEl.textContent = submitLabel;
      reveal(errorEl);
    }
  });
}

initContactForm();
