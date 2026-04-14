import type { Metadata } from "next";
import Link from "next/link";
import { XCircle, ArrowLeft, LifeBuoy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Pago cancelado" };

export default function CancelPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Pago cancelado
        </h1>
        <p className="mb-8 text-muted-foreground">
          Has cancelado el proceso de pago. No se ha realizado ningún cargo.
          Puedes volver a intentarlo en cualquier momento.
        </p>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Button asChild variant="default" className="gap-2">
            <Link href="/checkout?plan=pro">
              <ArrowLeft className="h-4 w-4" />
              Volver al checkout
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/dashboard">Ir al Dashboard</Link>
          </Button>
        </div>

        <Card className="text-left">
          <CardHeader>
            <CardTitle className="text-base">¿Necesitas ayuda?</CardTitle>
            <CardDescription>
              Nuestro equipo está disponible para resolver tus dudas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="mailto:support@payforce.dev"
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Contactar soporte</p>
                <p className="text-xs text-muted-foreground">
                  support@payforce.dev
                </p>
              </div>
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                <LifeBuoy className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Centro de ayuda</p>
                <p className="text-xs text-muted-foreground">
                  Preguntas frecuentes y guías
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          Si crees que ha habido un error, por favor contacta con nuestro equipo
        </p>
      </div>
    </main>
  );
}
