import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { OrderSummaryComponent } from "../../shared/components/order-summary/order-summary.component";
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { Router, RouterLink } from "@angular/router";
import { MatAnchor, MatButton } from "@angular/material/button";
import { StripeService } from '../../core/services/stripe.service';
import { ConfirmationToken, StripeAddressElement, StripeAddressElementChangeEvent, StripePaymentElement, StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Address } from '../../shared/models/user';
import { firstValueFrom } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { CheckoutDeliveryComponent } from "./checkout-delivery/checkout-delivery.component";
import { CheckoutReviewComponent } from "./checkout-review/checkout-review.component";
import { CartService } from '../../core/services/cart.service';
import { CurrencyPipe, JsonPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderToCreate, ShippingAddress } from '../../shared/models/order';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-checkout',
  imports: [
    OrderSummaryComponent,
    MatStepperModule,
    RouterLink,
    MatAnchor,
    MatButton,
    MatCheckboxModule,
    CheckoutDeliveryComponent,
    CheckoutReviewComponent,
    CurrencyPipe,
    JsonPipe,
    MatProgressSpinnerModule
],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy{
  private stripeService = inject(StripeService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private accountService = inject(AccountService);
  private orderService = inject(OrderService);
  cartService = inject(CartService);
  addressElement?: StripeAddressElement;
  paymentElement?: StripePaymentElement;
  saveAddress = false;
  completionStatus = signal<{address: boolean, card: boolean , delivery:boolean}>(
    {address: false, card: false, delivery: false}
  )

  confirmationToken?: ConfirmationToken;
  loading = false;

  async ngOnInit() {
    try {
      console.log('Test');
      this.addressElement = await this.stripeService.createAddressElement();
      if (this.addressElement){
      console.log('ngOnInit() this.addressElement: ' + this.addressElement);
      } else {
        console.log('Empty address element');
      }

      this.addressElement.mount('#address-element');
      console.log('ngOnInit() this.addressElement: ' + this.addressElement);
      this.addressElement.on('change', this.handleAddressChange)

      this.paymentElement = await this.stripeService.createPaymentElement();
      console.log('ngOnInit() this.paymentElement: ' + this.paymentElement);

      this.paymentElement.mount('#payment-element');
      this.paymentElement.on('change', this.handlePaymentChange);
    } catch (error: any) {
      this.snackbar.error(error.message);
      console.log(error);    
    }
  }

  handleAddressChange = (event: StripeAddressElementChangeEvent) => {
    this.completionStatus.update(state => {
      state.address = event.complete;
      return state;
    })
  }


  handlePaymentChange = (event: StripePaymentElementChangeEvent) => {
    this.completionStatus.update(state => {
      state.card = event.complete;
      return state;
    })
  }

  handleDeliveryChange(event: boolean) {
    this.completionStatus.update(state => {
      state.delivery = event;
      return state;
    })
  }

  async getConfirmationToken(){
    try {
       if (Object.values(this.completionStatus()).every(status => status === true)) {
        const result = await this.stripeService.createConfirmationToken();
        console.log('getConfirmationToken() result: ' + result);
        if (result.error) throw new Error(result.error.message);
        this.confirmationToken = result.confirmationToken;
        console.log('getConfirmationToken() this.confirmationToken: ' + this.confirmationToken);
       }
    } catch (error: any) {
      this.snackbar.error(error.message);
    }
   
  }

  async onStepChange(event: StepperSelectionEvent ) {
    if(event.selectedIndex === 1) {
      if(this.saveAddress) {
        const address = await this.getAddressFromStripeAddress() as Address;
        console.log('getConfirmationToken() address: ' + address);
        address && firstValueFrom(this.accountService.updateAddress(address));
      }
    }
    if (event.selectedIndex === 2) {
      await firstValueFrom(this.stripeService.createOrUpdatePaymentIntent());
    }
    if (event.selectedIndex === 3){
      await this.getConfirmationToken();
    }
  }

  async confirmPayment(stepper: MatStepper) {
    this.loading = true;
    try {
      if (this.confirmationToken) {
        const result = await this.stripeService.confirmPayment(this.confirmationToken);
        console.log('confirmPayment() result: ' + result);
        
        if (result.paymentIntent?.status === 'succeeded'){
          const order = await this.createOrderModel();
          console.log('confirmPayment() result: ' + result);
          const orderResult = await firstValueFrom(this.orderService.createOrder(order));
          console.log('confirmPayment() orderResult: ' + orderResult);
          if (orderResult) {
            this.orderService.orderComplete = true;
            this.cartService.deleteCart();
            this.cartService.selectedDelivery.set(null);
            this.router.navigateByUrl('/checkout/success');
          } else {
            throw new Error('Order creation failed');
          }
        } else if (result.error) {
          throw new Error(result.error.message);
        } else {
          throw new Error('Something went wrong');
        }
      }
    } catch (error: any) {
      this.snackbar.error(error.message || 'Something went wrong');
      stepper.previous();
    } finally {
      this.loading = false;
    }
  }

  private async createOrderModel(): Promise<OrderToCreate> {
    const cart = this.cartService.cart();
    console.log('createOrderModel() cart: ' + JSON.stringify(cart, null, 2));

    const shippingAddress = await this.getAddressFromStripeAddress() as ShippingAddress;
    console.log('createOrderModel() shippingAddress: ' + JSON.stringify(shippingAddress, null, 2));

    const card = this.confirmationToken?.payment_method_preview.card;
    console.log('createOrderModel() this.confirmationToken?.payment_method_preview.card: ' + JSON.stringify(this.confirmationToken?.payment_method_preview.card, null, 2));

    if (!cart?.id || !cart.deliveryMethodId || !card || !shippingAddress){
      throw new Error('Problem creating order');
    }

    return {
      cartId: cart.id,
      paymentSummaryDTO: {
        last4: +card.last4,
        brand: card.brand,
        expMonth: card.exp_month,
        expYear: card.exp_year
      },
      deliveryMethodId: cart.deliveryMethodId,
      shippingAddressDTO: shippingAddress
    }
    
  }

  private async getAddressFromStripeAddress(): Promise<Address | ShippingAddress | null>{
    const result = await this.addressElement?.getValue();
    console.log('getAddressFromStripeAddress() result: ' + result);

    const address = result?.value.address;
    console.log('getAddressFromStripeAddress() address: ' + address);

    if (address) {
      return {
        name: result.value.name,
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        country: address.country,
        state: address.state,
        postalCode: address.postal_code
      }
    } else return null;

  }

  onSaveAddressCheckboxChange(event: MatCheckboxChange){
     this.saveAddress = event.checked;
  }

  ngOnDestroy(): void {
      this.stripeService.disposeElemenents();
  }
}
