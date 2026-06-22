(function () {
  if (customElements.get("forge-reviews")) return;

  function starsHtml(rating, color) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    let html = "";
    for (let i = 0; i < 5; i++) {
      const filled = i < full || (i === full && half);
      html += `<span style="color:${filled ? color : "#ddd"}">★</span>`;
    }
    return html;
  }

  // Sample data shown when a block has data-sample="1" (preview mode in the
  // theme editor). Keeps the storefront from ever rendering fake reviews to
  // real shoppers.
  const SAMPLE_AGGREGATE = { rating: 4.7, count: 128 };
  const SAMPLE_REVIEWS = [
    {
      rating: 5,
      title: "Exactly what I was looking for",
      body: "Quality is fantastic, shipping was fast, and the packaging looked premium. Already ordered a second one for my sister.",
      author_name: "Emily R.",
      country: "US",
    },
    {
      rating: 5,
      title: "Worth every penny",
      body: "I was hesitant about the price but after using it for two weeks I have zero regrets. Highly recommend.",
      author_name: "Jonas K.",
      country: "DE",
    },
    {
      rating: 4,
      title: "Great, with one small nitpick",
      body: "Love the look and feel. The only thing I wish was different is the color of the strap, but overall I am very happy.",
      author_name: "Sofia M.",
      country: "ES",
    },
    {
      rating: 5,
      title: "Five stars from me",
      body: "Customer service was excellent when I had a question, and the product itself is even better than the photos.",
      author_name: "Marcus L.",
      country: "GB",
    },
  ];
  const SAMPLE_SUMMARY = {
    summary:
      "Customers love the build quality, packaging, and fast shipping. A few mention they would prefer more color options.",
    pros: ["Premium feel and finish", "Fast delivery", "Helpful customer service"],
    cons: ["Limited color choices", "Slightly above average price"],
  };

  class ForgeReviews extends HTMLElement {
    connectedCallback() {
      this.apiBase = this.dataset.apiBase || "";
      this.shop = this.dataset.shop || "";
      this.product = this.dataset.product || "";
      this.locale = document.documentElement.lang || "en";
      this.mode = this.dataset.mode || "box";
      this.perPage = Number(this.dataset.perPage || 10);
      this.starsColor = this.dataset.starsColor || "#f5a623";
      this.sample = this.dataset.sample === "1";
      this.init();
    }

    async init() {
      if (this.mode === "summary") {
        await this.renderSummary();
        return;
      }
      if (this.mode === "stars") {
        this.renderStars();
        return;
      }
      if (this.mode === "form") {
        this.renderForm();
        return;
      }
      await this.renderBox();
    }

    renderStars() {
      let rating = Number(this.dataset.rating || 0);
      let count = Number(this.dataset.count || 0);
      if (this.sample) {
        rating = SAMPLE_AGGREGATE.rating;
        count = SAMPLE_AGGREGATE.count;
      }
      this.innerHTML = `<div class="forge-reviews__stars">${starsHtml(rating, this.starsColor)} <span class="forge-reviews__count">(${count})</span></div>`;
    }

    async renderSummary() {
      if (this.sample) {
        this.renderSummaryFromData(SAMPLE_SUMMARY);
        return;
      }
      const url = `${this.apiBase}/api/reviews/summary?shop=${encodeURIComponent(this.shop)}&product=${encodeURIComponent(this.product)}&locale=${encodeURIComponent(this.locale)}`;
      const res = await fetch(url);
      if (res.status === 204) {
        this.innerHTML = "";
        return;
      }
      const data = await res.json();
      this.renderSummaryFromData(data);
    }

    renderSummaryFromData(data) {
      const pros = (data.pros || []).map((p) => `<li>${p}</li>`).join("");
      const cons = (data.cons || []).map((c) => `<li>${c}</li>`).join("");
      this.innerHTML = `
        <div class="forge-reviews__summary">
          ${this.sample ? '<div class="forge-reviews__sample-badge">Sample data</div>' : ""}
          <p>${data.summary || ""}</p>
          ${pros ? `<div><strong>Liked</strong><ul>${pros}</ul></div>` : ""}
          ${cons ? `<div><strong>To consider</strong><ul>${cons}</ul></div>` : ""}
        </div>`;
    }

    async renderBox() {
      let data;
      if (this.sample) {
        data = {
          aggregate: SAMPLE_AGGREGATE,
          reviews: SAMPLE_REVIEWS,
        };
      } else {
        const listUrl = `${this.apiBase}/api/reviews/list?shop=${encodeURIComponent(this.shop)}&product=${encodeURIComponent(this.product)}&locale=${encodeURIComponent(this.locale)}&per_page=${this.perPage}`;
        const res = await fetch(listUrl);
        data = await res.json();
      }
      const reviews = (data.reviews || [])
        .map(
          (r) => `<article class="forge-reviews__item">
            <div>${starsHtml(r.rating, this.starsColor)}</div>
            <h4>${r.title}</h4>
            <p>${r.body}</p>
            <small>${r.author_name}${r.country ? " • " + r.country : ""}</small>
          </article>`,
        )
        .join("");
      this.innerHTML = `
        <div class="forge-reviews__box">
          ${this.sample ? '<div class="forge-reviews__sample-badge">Sample data - preview only, not visible on storefront</div>' : ""}
          <div class="forge-reviews__aggregate">${starsHtml(data.aggregate?.rating || 0, this.starsColor)} <span>(${data.aggregate?.count || 0})</span></div>
          <div class="forge-reviews__list">${reviews || "<p>Be the first to leave a review.</p>"}</div>
          <div class="forge-reviews__form-wrap"></div>
        </div>`;
      const wrap = this.querySelector(".forge-reviews__form-wrap");
      if (wrap && !this.sample) {
        const formEl = document.createElement("forge-reviews");
        formEl.dataset.mode = "form";
        formEl.dataset.apiBase = this.apiBase;
        formEl.dataset.shop = this.shop;
        formEl.dataset.product = this.product;
        wrap.appendChild(formEl);
      }
    }

    renderForm() {
      this.innerHTML = `
        ${this.sample ? '<div class="forge-reviews__sample-badge">Sample data - preview only</div>' : ""}
        <form class="forge-reviews__form">
          <input type="hidden" name="hp_url" value="" tabindex="-1" autocomplete="off" />
          <input type="hidden" name="t_open" value="${Date.now()}" />
          <label>Rating<br /><select name="rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n}</option>`).join("")}</select></label><br />
          <label>Headline<br /><input name="title" required /></label><br />
          <label>Review<br /><textarea name="body" required rows="4"></textarea></label><br />
          <label>Name<br /><input name="author_name" /></label><br />
          <label>Email<br /><input name="email" type="email" required /></label><br />
          <label>Photos<br /><input name="photos[]" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label><br />
          <button type="submit"${this.sample ? " disabled" : ""}>Submit review</button>
          <p class="forge-reviews__message" hidden></p>
        </form>`;
      this.querySelector("form")?.addEventListener("submit", (e) => this.onSubmit(e));
    }

    async onSubmit(e) {
      e.preventDefault();
      if (this.sample) return;
      const form = e.target;
      const fd = new FormData(form);
      fd.set("shop", this.shop);
      fd.set("product", this.product);
      fd.set("locale", this.locale);
      const msg = form.querySelector(".forge-reviews__message");
      try {
        const res = await fetch(`${this.apiBase}/api/reviews/submit`, { method: "POST", body: fd });
        const data = await res.json();
        if (msg) {
          msg.hidden = false;
          msg.textContent =
            data.status === "pending"
              ? "Thanks - your review is pending approval."
              : data.error || "Something went wrong.";
        }
        if (data.status === "pending") form.reset();
      } catch {
        if (msg) {
          msg.hidden = false;
          msg.textContent = "Something went wrong.";
        }
      }
    }
  }

  customElements.define("forge-reviews", ForgeReviews);
})();
