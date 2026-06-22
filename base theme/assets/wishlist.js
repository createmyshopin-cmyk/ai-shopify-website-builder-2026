/**
 * Local wishlist stored in localStorage.
 */
export class Wishlist {
  /** @static @constant {string} */
  static #STORAGE_KEY = 'forgeWishlist';

  /**
   * @returns {string[]}
   */
  static getItems() {
    return JSON.parse(localStorage.getItem(this.#STORAGE_KEY) || '[]');
  }

  /**
   * @param {string | number} productId
   * @returns {boolean}
   */
  static has(productId) {
    return this.getItems().includes(String(productId));
  }

  /**
   * @param {string | number} productId
   * @returns {boolean} Whether the product is now in the wishlist
   */
  static toggle(productId) {
    const id = String(productId);
    let items = this.getItems();
    const wasInWishlist = items.includes(id);

    if (wasInWishlist) {
      items = items.filter((item) => item !== id);
    } else {
      items = [id, ...items.filter((item) => item !== id)];
    }

    localStorage.setItem(this.#STORAGE_KEY, JSON.stringify(items));

    document.dispatchEvent(
      new CustomEvent('wishlist:update', {
        bubbles: true,
        detail: {
          productId: id,
          inWishlist: !wasInWishlist,
          items,
          count: items.length,
        },
      })
    );

    return !wasInWishlist;
  }

  /**
   * @returns {number}
   */
  static getCount() {
    return this.getItems().length;
  }
}

/**
 * Toggle button for adding/removing products from the wishlist.
 *
 * @extends {HTMLElement}
 */
class WishlistButton extends HTMLElement {
  /** @type {HTMLButtonElement | null} */
  #button = null;

  /** @type {string | undefined} */
  #productId;

  connectedCallback() {
    this.#button = this.querySelector('button');
    this.#productId = this.dataset.productId;

    if (!this.#button || !this.#productId) return;

    this.#button.addEventListener('click', this.#handleClick);
    document.addEventListener('wishlist:update', this.#handleWishlistUpdate);
    this.#updateState();
  }

  disconnectedCallback() {
    this.#button?.removeEventListener('click', this.#handleClick);
    document.removeEventListener('wishlist:update', this.#handleWishlistUpdate);
  }

  /** @param {MouseEvent} event */
  #handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!this.#productId) return;

    Wishlist.toggle(this.#productId);
    this.#updateState();
  };

  #handleWishlistUpdate = () => {
    this.#updateState();
  };

  #updateState() {
    if (!this.#button || !this.#productId) return;

    const active = Wishlist.has(this.#productId);

    this.classList.toggle('is-active', active);
    this.#button.setAttribute('aria-pressed', active ? 'true' : 'false');

    const title = this.dataset.productTitle || 'product';
    this.#button.setAttribute(
      'aria-label',
      active ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`
    );
  }
}

if (!customElements.get('wishlist-button')) {
  customElements.define('wishlist-button', WishlistButton);
}
