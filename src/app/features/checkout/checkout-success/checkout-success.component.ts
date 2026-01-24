import { Component, inject, OnDestroy } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { SignalrService } from '../../../core/services/signalr.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { AddressPipe } from '../../../shared/pipes/address-pipe';
import { PaymentCardPipe } from '../../../shared/pipes/payment-card-pipe';

@Component({
  selector: 'app-checkout-success',
  imports: [
    MatButton,
    RouterLink,
    MatProgressSpinnerModule,
    DatePipe,
    CurrencyPipe,
    AddressPipe,
    PaymentCardPipe
  ],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-success.component.scss'
})
export class CheckoutSuccessComponent implements OnDestroy {
   signalrService = inject(SignalrService);
   private orderService = inject(OrderService);

   ngOnDestroy(): void {
     this.orderService.orderComplete = false;
     this.signalrService.orderSignal.set(null);
   }
}
