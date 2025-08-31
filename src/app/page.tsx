
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Share2, Workflow } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Unleash Your Ideas with CanvasNote
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    A unified workspace for your notes and diagrams, powered by AI. Seamlessly switch between text and visuals.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/canvas">
                      Go to Canvas
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://picsum.photos/600/400"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="workspace diagram"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Features</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to bring your ideas to life. From simple notes to complex diagrams.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card>
                <CardHeader>
                  <BrainCircuit className="h-8 w-8 mb-2" />
                  <CardTitle>AI-Powered Diagrams</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Automatically generate diagrams from your notes and get smart suggestions for connections.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Workflow className="h-8 w-8 mb-2" />
                  <CardTitle>Intuitive Diagramming</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Create and connect shapes with ease using a simple and powerful drag-and-drop interface.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Share2 className="h-8 w-8 mb-2" />
                  <CardTitle>Export and Share</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Export your notes to Markdown and your diagrams to SVG to share your work with others.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
