
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BrainCircuit, LogIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CanvasMetadata } from '@/types';
import { useAuth } from '@/context/auth-context';

export default function HomePage() {
  const [canvases, setCanvases] = useState<CanvasMetadata[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    setIsMounted(true);
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    // TODO: Replace with Firestore logic
    try {
      const savedCanvases = localStorage.getItem('canvasnote-all-canvases');
      if (savedCanvases) {
        const parsedCanvases = JSON.parse(savedCanvases) as CanvasMetadata[];
        parsedCanvases.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        setCanvases(parsedCanvases);
      }
    } catch (error) {
      console.error("Failed to load canvases from localStorage", error);
    }
  }, [user, loading, router]);

  const handleCreateNewCanvas = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    const newCanvasId = `canvas-${Date.now()}`;
    const newCanvas: CanvasMetadata = {
      id: newCanvasId,
      name: 'Untitled Canvas',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    // TODO: Replace with Firestore logic
    try {
      const updatedCanvases = [...canvases, newCanvas];
      localStorage.setItem('canvasnote-all-canvases', JSON.stringify(updatedCanvases));
      
      const newCanvasData = {
        notes: '',
        elements: [],
        connections: [],
        toolbarPosition: { x: 16, y: 100 },
        transform: { scale: 1, dx: 0, dy: 0 },
      };
      localStorage.setItem(`canvasnote-data-${newCanvasId}`, JSON.stringify(newCanvasData));

      router.push(`/canvas/${newCanvasId}`);
    } catch (error) {
      console.error("Failed to create new canvas in localStorage", error);
    }
  };

  if (!isMounted || loading || !user) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </header>
      
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Start a new project</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            className="flex flex-col items-center justify-center p-6 text-center hover:bg-accent hover:border-primary transition-colors cursor-pointer"
            onClick={handleCreateNewCanvas}
          >
            <Plus className="h-12 w-12 mb-4 text-primary" />
            <CardTitle>Create New Canvas</CardTitle>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 text-center bg-muted/50 cursor-not-allowed">
              <BrainCircuit className="h-12 w-12 mb-4 text-muted-foreground" />
              <CardTitle className="text-muted-foreground">Generate AI Diagram</CardTitle>
              <p className="text-sm text-muted-foreground">(Coming Soon)</p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Canvases</h2>
        {canvases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {canvases.map((canvas) => (
              <Link href={`/canvas/${canvas.id}`} key={canvas.id}>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="truncate">{canvas.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div 
                        className="aspect-video bg-secondary rounded-md mb-4 flex items-center justify-center"
                      >
                       <p className="text-xs text-muted-foreground">No preview</p>
                      </div>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {formatDistanceToNow(new Date(canvas.lastModified), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No canvases yet.</p>
            <Button variant="link" onClick={handleCreateNewCanvas}>Create your first canvas</Button>
          </div>
        )}
      </section>
    </div>
  );
}
