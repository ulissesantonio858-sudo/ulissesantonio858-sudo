// Essência Estética — interações mínimas: menu móvel, navegação ativa e diálogo de reserva (demonstração).

(() => {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu-principal');
  const mobileQuery = window.matchMedia('(max-width: 940px)');

  /* ---------- Menu móvel ---------- */

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    if (open) menu.querySelector('a, button')?.focus();
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

  menu.addEventListener('click', (event) => {
    if (mobileQuery.matches && event.target.closest('a, button')) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  mobileQuery.addEventListener('change', () => setMenu(false));

  /* ---------- Navegação ativa ---------- */

  const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"]:not([data-open-booking])')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((section) => spy.observe(section));

  /* ---------- Diálogo de reserva ---------- */

  const dialog = document.getElementById('contacto');
  const form = dialog.querySelector('.booking-form');
  const formView = dialog.querySelector('.booking-form-view');
  const successView = dialog.querySelector('.booking-success');
  const fields = {
    nome: form.elements.nome,
    email: form.elements.email,
    servico: form.elements.servico,
  };
  const errors = {
    nome: document.getElementById('e-nome'),
    email: document.getElementById('e-email'),
    servico: document.getElementById('e-servico'),
  };
  let opener = null;

  const resetDialog = () => {
    form.reset();
    Object.values(errors).forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    formView.hidden = false;
    successView.hidden = true;
  };

  const openBooking = (trigger, service) => {
    opener = trigger;
    resetDialog();
    if (service) {
      const option = [...fields.servico].find((radio) => radio.value === service);
      if (option) option.checked = true;
    }
    dialog.showModal();
    fields.nome.focus();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-booking]');
    if (!trigger) return;
    event.preventDefault();
    openBooking(trigger, trigger.dataset.service);
  });

  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-booking]')) dialog.close();
    // Clique no fundo (fora do conteúdo) também fecha.
    if (event.target === dialog) dialog.close();
  });

  // Escape é tratado nativamente pelo <dialog>; devolvemos o foco à origem.
  dialog.addEventListener('close', () => {
    if (opener && document.contains(opener)) {
      // Se a origem estava no menu móvel já fechado, devolve ao botão do menu.
      const target = opener.offsetParent === null && mobileQuery.matches ? toggle : opener;
      target.focus();
    }
    opener = null;
  });

  // Mantém o foco dentro do diálogo (reforço para além do comportamento nativo de showModal).
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const showError = (key, message, element) => {
    errors[key].textContent = message;
    if (element) element.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const validate = () => {
    let firstInvalid = null;
    const nome = fields.nome.value.trim();
    const email = fields.email.value.trim();
    const servico = form.querySelector('input[name="servico"]:checked');

    if (!nome) {
      showError('nome', 'Indique o seu nome.', fields.nome);
      firstInvalid ??= fields.nome;
    } else showError('nome', '', fields.nome);

    if (!email) {
      showError('email', 'Indique o seu e-mail.', fields.email);
      firstInvalid ??= fields.email;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showError('email', 'Verifique o formato do e-mail (ex.: nome@exemplo.pt).', fields.email);
      firstInvalid ??= fields.email;
    } else showError('email', '', fields.email);

    if (!servico) {
      showError('servico', 'Escolha o serviço de interesse.');
      firstInvalid ??= fields.servico[0];
    } else showError('servico', '');

    return { firstInvalid, nome, servico: servico?.value };
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { firstInvalid, nome, servico } = validate();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    successView.querySelector('[data-success-name]').textContent = nome.split(/\s+/)[0];
    successView.querySelector('[data-success-service]').textContent = servico.toLowerCase();
    formView.hidden = true;
    successView.hidden = false;
    successView.querySelector('.booking-title').focus();
  });

  // Limpa o erro do serviço assim que uma opção é escolhida.
  form.addEventListener('change', (event) => {
    if (event.target.name === 'servico') showError('servico', '');
  });
})();
