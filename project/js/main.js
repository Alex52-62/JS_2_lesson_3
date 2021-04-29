// Всё же оставил в коде свою попытку обойти корс, т.к. сначала пробовал без raw

/*(function() {
    var cors_api_host = 'cors-anywhere.herokuapp.com';
    var cors_api_url = 'https://' + cors_api_host + '/';
    var slice = [].slice;
    var origin = window.location.protocol + '//' + window.location.host;
    var open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        var args = slice.call(arguments);
        var targetOrigin = /^https?:\/\/([^\/]+)/i.exec(args[1]);
        if (targetOrigin && targetOrigin[0].toLowerCase() !== origin &&
            targetOrigin[1] !== cors_api_host) {
            args[1] = cors_api_url + args[1];
        }
        return open.apply(this, args);
    };
})();*/


const API = 'https://raw.githubusercontent.com/GeekBrainsTutorial/online-store-api/master/responses';

// мой вариант

let getRequest = (url, callBack) => {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true); // true - асинхронный запрос
        //     xhr.onload = () => resolve(callBack(xhr.responseText));   ну или так - источник: https://learn.javascript.ru/onload-onerror
        //      xhr.onerror = () => reject(xhr.statusText);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status !== 200) {
                    console.log('Error ');
                } else {
                    callBack(xhr.responseText);
                }
            }
        };
        xhr.send();
    });
}

// Переведено на промисы
// let getRequest = (url) => {
//     return new Promise((resolve, reject) => {
//         let xhr = new XMLHttpRequest();
//         xhr.open("GET", url, true);
//         xhr.onreadystatechange = () => {
//             if(xhr.readyState === 4){
//                 if(xhr.status !== 200){
//                     reject('Error');
//                 } else {
//                     resolve(xhr.responseText);
//                 }
//             }
//         };
//         xhr.send();
//     })
// };


// введём глобальную переменную total, в которой будем хранить сумму товаров в корзине
var total;
/**
 * Описываем базовые классы
 */
class List {
    constructor(url, container, list = listContext) {
        this.container = container;
        this.list = list; // словарь для классов 
        this.url = url;
        this.goods = [];
        this.allProducts = [];
        this.filtered = []; // отфильтрованные товары
        this._init();
    }

    /**
     * получение данных с сервера
     * @param url
     * @returns {Promise<any | never>}
     */
    getJson(url) {
        return fetch(url ? url : `${API + this.url}`)
            .then(result => result.json())
            .catch(error => {
                console.log(error);
            })
    }

    /**
     * обработка полученных данных
     * @param data
     */
    handleData(data) {
        this.goods = data;
        this.render();

    }

    /**
     * подсчет стоимости всех товаров
     * @returns {*|number}
     */
    calcSum() {
        return this.allProducts.reduce((accum, item) => accum += item.price, 0);
    }
    render() {
        const block = document.querySelector(this.container);
        for (let product of this.goods) {
            console.log(this.constructor.name);
            const productObj = new this.list[this.constructor.name](product);

            // альтернативаня реализация без словаря
            // let productObj = null;
            // if (this.constructor.name === 'ProductsList') productObj = new ProductItem(product);
            // if (this.constructor.name === 'Cart') productObj = new CartItem(product);
            if (!productObj) return;

            console.log(productObj);
            this.allProducts.push(productObj);
            block.insertAdjacentHTML('beforeend', productObj.render());
        }
    }

    /**
     * метод поиска товаров
     * @param value - поисковый запрос
     */
    filter(value) {
        const regexp = new RegExp(value, 'i'); //
        this.filtered = this.allProducts.filter(product => regexp.test(product.product_name));
        this.allProducts.forEach(el => {
            const block = document.querySelector(`.product-item[data-id="${el.id_product}"]`);
            if (!this.filtered.includes(el)) {
                block.classList.add('invisible');
            } else {
                block.classList.remove('invisible');
            }
        })
    }
    _init() {
        return false
    }
}

class Item {
    constructor(el, img = 'https://via.placeholder.com/200x150') {
        this.product_name = el.product_name;
        this.price = el.price;
        this.id_product = el.id_product;
        this.img = img;
    }
    render() {
        return ``;
    }
}

/**
 * Наследуемся от базовых классов
 */
class ProductsList extends List {
    constructor(cart, container = '.products', url = "/catalogData.json") {
        super(url, container);
        this.cart = cart;
        this.getJson()
            .then(data => this.handleData(data));
    }

    _init() {
        document.querySelector(this.container).addEventListener('click', e => {
            if (e.target.classList.contains('buy-btn')) {
                this.cart.addProduct(e.target);
            }
        });
        document.querySelector('.search-form').addEventListener('submit', e => {
            e.preventDefault();
            this.filter(document.querySelector('.search-field').value)
        })
    }
}

class ProductItem extends Item {
    render() {
        return `<div class="product-item" data-id="${this.id_product}">
                <img src="${this.img}" alt="Some img">
                <div class="desc">
                    <h3>${this.product_name}</h3>
                    <p>${this.price} ₽</p>
                    <button class="buy-btn"
                      data-id="${this.id_product}"
                      data-name="${this.product_name}"
                      data-price="${this.price}">Купить</button>
                </div>
            </div>`;
    }
}

class Cart extends List {
    constructor(container = ".cart-block", url = "/getBasket.json") {
        super(url, container);
        this.getJson()
            .then(data => {
                this.handleData(data.contents); // вытаскиваем из JSON содержимое contents
                this._basketCount();
                this._basketSumm();
            });

    }

    /**
     * добавление товара
     * @param element
     */
    addProduct(element) {
        this.getJson(`${API}/addToBasket.json`)
            .then(data => {
                if (data.result === 1) {
                    let productId = +element.dataset['id'];
                    let find = this.allProducts.find(product => product.id_product === productId);
                    if (find) {
                        find.quantity++;
                        this._updateCart(find);
                        total = this.goods.price;
                        this._basketCount();
                        this._basketSumm();

                    } else {
                        let product = {
                            id_product: productId,
                            price: +element.dataset['price'],
                            product_name: element.dataset['name'],
                            quantity: 1
                        };
                        // goods - это своего рода "опорный" массив, отражающий список товаров, которые нужно отрендерить.
                        // При добавлении нового товара, нас интересует только он один.
                        this.goods = [product];
                        // далее вызывая метод render, мы добавим в allProducts только его, тем самым избегая лишнего перерендера.
                        this.render();
                        total = this.goods.price;
                        this._basketCount();
                        this._basketSumm();
                    }
                } else {
                    alert('Error');
                }

            })
    }

    /**
     * удаление товара
     * @param element
     */
    removeProduct(element) {
        this.getJson(`${API}/deleteFromBasket.json`)
            .then(data => {
                if (data.result === 1) {
                    let productId = +element.dataset['id'];
                    let find = this.allProducts.find(product => product.id_product === productId);
                    if (find.quantity > 1) { // если товара > 1, то уменьшаем количество на 1
                        find.quantity--;
                        this._updateCart(find);
                        document.getElementById('summ').innerHTML = total - find.price;
                        total = Number(total - find.price);
                    } else { // удаляем
                        this.allProducts.splice(this.allProducts.indexOf(find), 1);
                        document.querySelector(`.cart-item[data-id="${productId}"]`).remove();
                        document.getElementById('cartcoint').innerHTML = ' (' + this.allProducts.length + ')';
                        document.getElementById('summ').innerHTML = total - find.price;
                        total = Number(total - find.price);
                    }
                } else {
                    alert('Error');
                }
            })
    }

    /**
     * обновляем данные корзины
     * @param product
     * @private
     */
    _updateCart(product) {
        let block = document.querySelector(`.cart-item[data-id="${product.id_product}"]`);
        block.querySelector('.product-quantity').textContent = `Количество: ${product.quantity}`;
        block.querySelector('.product-price').textContent = `${product.quantity * product.price} ₽`;

    }
    _init() {
        document.querySelector('.btn-cart').addEventListener('click', () => {
            document.querySelector(this.container).classList.toggle('invisible');
        });
        document.querySelector(this.container).addEventListener('click', e => {
            if (e.target.classList.contains('del-btn')) {
                this.removeProduct(e.target);

            }
        })
    }

    _basketCount() {
        let count = this.allProducts.length;
        document.getElementById('cartcoint').innerHTML = ' (' + count + ')';
    }

    _basketSumm() {
        var summary = this.allProducts.reduce((summ, item) => summ += item.price * item.quantity, 0);
        document.getElementById('summ').innerHTML = summary;
        total = summary;

    }

}

class CartItem extends Item {
    constructor(el, img = 'https://via.placeholder.com/50x100') {
        super(el, img);
        this.quantity = el.quantity;
    }
    render() {
        return `<div class="cart-item" data-id="${this.id_product}">
            <div class="product-bio">
            <img src="${this.img}" alt="Some image">
                <div class="product-desc">
                <p class="product-title">${this.product_name}</p>
                <p class="product-quantity">Количество: ${this.quantity}</p>
                <p class="product-single-price">${this.price} за ед.</p>
                </div>
            </div>
        <div class="right-block">
            <p class="product-price">${this.quantity*this.price} ₽</p>
            <button class="del-btn" data-id="${this.id_product}">&times;</button>
        </div>
        </div>`
    }
}

const listContext = {
    ProductsList: ProductItem,
    Cart: CartItem
};

// let cart = new Cart();
// let products = new ProductsList(cart);

new ProductsList(new Cart());