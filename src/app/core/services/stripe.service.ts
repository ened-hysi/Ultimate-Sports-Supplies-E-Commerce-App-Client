import { inject, Injectable } from '@angular/core';
import {ConfirmationToken, loadStripe, Stripe, StripeAddressElement, StripeAddressElementOptions, StripeElements, StripePaymentElement} from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { Cart } from '../../shared/models/cart';
import { firstValueFrom, map } from 'rxjs'; 
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  baseUrl = environment.apiUrl;
  private cartService = inject(CartService);
  private accountService = inject(AccountService);
  private http = inject(HttpClient);
  private stripePromise: Promise<Stripe | null>;
  private elements?: StripeElements;
  private addressElement?: StripeAddressElement;
  private paymentElement?: StripePaymentElement;

  constructor() {
    this.stripePromise = loadStripe(environment.stripePublicKey);
    console.log('StripeService constructor(): this.stripePromise : ' + this.stripePromise);
  }

  getStripeInstance() {
    console.log('getStripeInstance(): this.stripePromise : '+ this.stripePromise);
    return this.stripePromise;
  }

  async initializeElements() {
    if (!this.elements) {
      const stripe = await this.getStripeInstance();
      console.log('initializeElements(): stripe : '+ stripe);
      if (stripe) {
        const cart = await firstValueFrom(this.createOrUpdatePaymentIntent());
        console.log('initializeElements(): cart : ' + JSON.stringify(cart, null, 2));
        this.elements = stripe.elements(
           {clientSecret: cart.clientSecret, appearance: {labels: 'floating'}});
      } else {
        throw new Error('Stripe has not been loaded');
      }
    }
    console.log('initializeElements(): this.elements : ' + this.elements);
    return this.elements;
  }

  async createPaymentElement(){
    if (!this.paymentElement){
      const elements = await this.initializeElements();
      console.log('createPaymentElement(): elements : ' + elements);
      if (elements) {
        this.paymentElement = elements.create('payment');
      } else {
        throw new Error('Elements instance has not been initialized');
      }
    }
     console.log('createPaymentElement(): this.paymentElement : ' + this.paymentElement);
     return this.paymentElement;
  }

  async createAddressElement() {
    if (!this.addressElement) {
      const elements = await this.initializeElements();
      console.log('createAddressElement(): elements : ' + elements);
      if (elements) {
        const user = this.accountService.currentUser();
        console.log('createAddressElement(): user : ' + user);
        let defaultValues: StripeAddressElementOptions['defaultValues'] = {};
        console.log('createAddressElement(): defaultValues : '+JSON.stringify(defaultValues, null, 2));

        if (user) {
          defaultValues.name = user.firstName + ' ' + user.lastName;
          console.log('createAddressElement(): defaultValues.name : '+JSON.stringify(defaultValues.name, null, 2));
        }

        if (user?.address) {
          defaultValues.address = {
            line1: user.address.line1,
            line2: user.address.line2,
            city: user.address.city,
            state: user.address.state,
            country: user.address.country,
            postal_code: user.address.postalCode
          }
          console.log('createAddressElement(): defaultValues.address : '+JSON.stringify(defaultValues.address, null, 2));
        }
      

        const options: StripeAddressElementOptions = {
          mode: 'shipping',
          defaultValues
        };
        console.log('createAddressElement(): options : '+JSON.stringify(options, null, 2));

        this.addressElement = elements.create('address', options);
        } else {
        throw new Error('Elements instance has not been loaded');
      }
    }
    console.log('createAddressElement(): this.addressElement : ' + this.addressElement);
    return this.addressElement;
  }


  async createConfirmationToken(){
     const stripe = await this.getStripeInstance();
     const elements = await this.initializeElements();
     const result = await elements.submit();
     console.log('createConfirmationToken(): stripe : '+ stripe);
     console.log('createConfirmationToken(): elements : '+ elements);
     console.log('createConfirmationToken(): result : ' + result);

     if (result.error) throw new Error(result.error.message);
     if (stripe) {
      return await stripe.createConfirmationToken({elements});
     } else {
      throw new Error('Stripe not available');
     }
  }


  async confirmPayment(confirmationToken: ConfirmationToken) {
    const stripe = await this.getStripeInstance();
    const elements = await this.initializeElements();
    const result = await elements.submit();
    console.log('confirmPayment(): stripe : ' + stripe);
    console.log('confirmPayment(): elements : '+ elements);
    console.log('confirmPayment(): result : ' + result);

    if (result.error) throw new Error(result.error.message);

    const clientSecret = this.cartService.cart()?.clientSecret;
    console.log('confirmPayment(): clientSecret : '+JSON.stringify(clientSecret, null, 2));

    if(stripe && clientSecret) {
      return await stripe.confirmPayment({
        clientSecret: clientSecret,
        confirmParams: {
          confirmation_token: confirmationToken.id
        },
        redirect: 'if_required'
      })
    } else {
      throw new Error('Unable to load stripe');
    }
  }

  createOrUpdatePaymentIntent() {
    const cart = this.cartService.cart();
    console.log('createOrUpdatePaymentIntent(): cart : '+JSON.stringify(cart, null, 2));

    if(!cart) throw new Error('Problem with cart');

    return this.http.post<Cart>(this.baseUrl + 'payments/' + cart.id, {}).pipe(
    map(cart => {
      console.log('createOrUpdatePaymentIntent(): cart : '+JSON.stringify(cart, null, 2));
      this.cartService.setCart(cart);
      return cart;
    })
    )
  }

  disposeElemenents() {
    this.elements = undefined;
    this.addressElement = undefined;
    this.paymentElement = undefined;
  }
}
