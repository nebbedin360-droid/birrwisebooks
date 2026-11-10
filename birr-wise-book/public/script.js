document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('order-form');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();

    if (!name || !phone) {
      alert('እባክዎ ስም እና ስልክ ቁጥር ያስገቡ።');
      return;
    }

    // Disable button while submitting
    submitBtn.disabled = true;
    submitBtn.textContent = 'በመላክ ላይ...';

    try {
      const formData = new FormData(form);

      // If Formspree is configured (replace YOUR_FORM_ID)
      const action = form.getAttribute('action');
      const isFormspreeReady = action && !action.includes('YOUR_FORM_ID');

      if (isFormspreeReady) {
        const response = await fetch(action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          showSuccess();
        } else {
          throw new Error('Submission failed');
        }
      } else {
        // Fallback for demo / before Formspree is set up:
        // Just show success and log data (you can later connect real backend)
        console.log('Form data (demo mode):', Object.fromEntries(formData));
        showSuccess();
      }
    } catch (err) {
      console.error(err);
      alert('ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ ወይም በቀጥታ በ TikTok ያግኙን።');
      submitBtn.disabled = false;
      submitBtn.textContent = 'ጥያቄ ይላኩ';
    }
  });

  function showSuccess() {
    form.innerHTML = `
      <div class="form-success">
        <h3>ጥያቄዎ ተልኳል ✓</h3>
        <p>በቅርቡ Birr Wise ያገኝዎታል።<br>መጽሐፉን እንዴት እንደሚያገኙ በስልክ ወይም በመልዕክት ይነገርዎታል።</p>
      </div>
    `;
  }
});
