'use client';

import Button from '@/components/ui/Button';
import type { Tables } from '@/types_db';
import { User } from '@supabase/supabase-js';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SubscriptionRecurringInterval } from '@polar-sh/sdk/models/components';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';

type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;
interface ProductWithPrices extends Product {
  prices: Price[];
}
interface PriceWithProduct extends Price {
  products: Product | null;
}
interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

export default function Pricing({ user, products, subscription }: Props) {
  const intervals = Array.from(
    new Set(
      products.flatMap((product) =>
        product?.prices?.map((price) => price?.recurring_interval)
      )
    )
  );
  const router = useRouter();
  const [billingInterval, setBillingInterval] =
    useState<SubscriptionRecurringInterval>('month');
  const [priceIdLoading, setPriceIdLoading] = useState<string>();

  const handleStripeCheckout = async (
    price: Price,
    subscription: SubscriptionWithProduct | null
  ) => {
    if (subscription) {
      return router.push('/account/portal');
    }

    setPriceIdLoading(price.id);

    if (!user) {
      setPriceIdLoading(undefined);
      return router.push('/signin/signup');
    }

    const polarCustomerId = await createOrRetrieveCustomer({
      email: user.email || '',
      uuid: user.id
    });

    const url = new URL('/checkout', window.location.origin);
    url.searchParams.set('productPriceId', price.id);
    url.searchParams.set('customerId', polarCustomerId);
    url.searchParams.set('metadata', JSON.stringify({ customerId: user.id }));

    router.push(url.toString());

    setPriceIdLoading(undefined);
  };

  if (!products.length) {
    return (
      <section className="bg-black">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            No subscription pricing plans found. Create them in your{' '}
            <a
              className="text-pink-500 underline"
              href="https://sandbox.polar.sh/start"
              rel="noopener noreferrer"
              target="_blank"
            >
              Polar Dashboard
            </a>
            .
          </p>
        </div>
      </section>
    );
  } else {
    return (
      <section className="bg-black">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
              Pricing Plans
            </h1>
            <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
              Start building for free, then add a site plan to go live. Account
              plans unlock additional features.
            </p>
            <div className="relative self-center mt-6 bg-zinc-900 rounded-lg p-0.5 flex sm:mt-8 border border-zinc-800">
              {intervals.includes('month') && (
                <button
                  onClick={() => setBillingInterval('month')}
                  type="button"
                  className={`${
                    billingInterval === 'month'
                      ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                      : 'ml-0.5 relative w-1/2 border border-transparent text-zinc-400'
                  } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                >
                  Monthly billing
                </button>
              )}
              {intervals.includes('year') && (
                <button
                  onClick={() => setBillingInterval('year')}
                  type="button"
                  className={`${
                    billingInterval === 'year'
                      ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                      : 'ml-0.5 relative w-1/2 border border-transparent text-zinc-400'
                  } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                >
                  Yearly billing
                </button>
              )}
            </div>
          </div>
          <div className="mt-12 space-y-0 sm:mt-16 flex flex-wrap justify-center gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {products.map((product) => {
              const price = product?.prices?.find(
                (price) => price.recurring_interval === billingInterval
              );
              if (!price) return null;
              const priceString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }).format((price?.price_amount || 0) / 100);
              return (
                <div
                  key={product.id}
                  className={cn(
                    'flex flex-col rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900',
                    {
                      'border border-pink-500': subscription
                        ? product.name === subscription?.prices?.products?.name
                        : product.name === 'Freelancer'
                    },
                    'flex-1', // This makes the flex item grow to fill the space
                    'basis-1/3', // Assuming you want each card to take up roughly a third of the container's width
                    'max-w-xs' // Sets a maximum width to the cards to prevent them from getting too large
                  )}
                >
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold leading-6 text-white">
                      {product.name}
                    </h2>
                    <p className="mt-4 text-zinc-300">{product.description}</p>
                    <p className="mt-8">
                      <span className="text-5xl font-extrabold white">
                        {priceString}
                      </span>
                      <span className="text-base font-medium text-zinc-100">
                        /{billingInterval}
                      </span>
                    </p>
                    <Button
                      variant="slim"
                      type="button"
                      loading={priceIdLoading === price.id}
                      onClick={() => handleStripeCheckout(price, subscription)}
                      className="block w-full py-2 mt-8 text-sm font-semibold text-center text-white rounded-md hover:bg-zinc-900"
                    >
                      {subscription ? 'Manage' : 'Subscribe'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
}
