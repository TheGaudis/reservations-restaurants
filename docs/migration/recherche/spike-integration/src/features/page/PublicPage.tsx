import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { FormattedMessage, FormattedNumber } from "react-intl";

import { BookingForm } from "@/features/booking/BookingForm";
import { formatLongDate } from "@/intl/dates";
import { publicStateOptions } from "@/queries/state";
import { Dialog } from "@/ui/Dialog";

const routeApi = getRouteApi("/");

export function PublicPage() {
  const { data } = useSuspenseQuery(publicStateOptions);
  const search = routeApi.useSearch();
  const day = data.daysR1[0];
  return (
    <main data-testid="content">
      <h1>{data.name1}</h1>
      <p>
        <FormattedNumber value={data.priceStudent} format="euro" />
      </p>
      {day ? (
        <section>
          <h2>{formatLongDate(day.date)}</h2>
          <p>
            <FormattedMessage
              id="public.r1.remaining"
              defaultMessage="{rem, plural, one {# place restante} other {# places restantes}}"
              description="05 § 4 — places restantes"
              values={{ rem: day.capacity - day.booked }}
            />
          </p>
          <Link to="/" search={(prev) => ({ ...prev, reserver: "r1" })}>
            <FormattedMessage
              id="public.r1.bookLink"
              defaultMessage="Réserver"
              description="lien qui ouvre le formulaire"
            />
          </Link>
          {search.reserver === "r1" ? <BookingForm remaining={day.capacity - day.booked} /> : null}
          <Dialog
            trigger={
              <FormattedMessage
                id="public.r1.menu"
                defaultMessage="Voir le menu"
                description="ouvre le menu"
              />
            }
            title={
              <FormattedMessage
                id="public.r1.menuTitle"
                defaultMessage="Menu du jour"
                description="titre"
              />
            }
          >
            <p>{day.menu}</p>
          </Dialog>
        </section>
      ) : null}
    </main>
  );
}
