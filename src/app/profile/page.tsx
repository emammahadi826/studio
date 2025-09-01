"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function ProfilePage() {
  return (
    <div className="p-8 space-y-8">
        <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">View and manage your profile information.</p>
        </div>
        <Separator />
        
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex items-start gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src="https://picsum.photos/100" alt="User avatar" data-ai-hint="profile avatar" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-3xl">Your Name</CardTitle>
                                <CardDescription>your.email@example.com</CardDescription>
                            </div>
                            <Button variant="outline">Edit Profile</Button>
                        </div>
                        <Separator className="my-4" />
                        <div className="text-sm text-muted-foreground space-y-2">
                             <p>This is a placeholder bio where you can describe yourself. It's a great way to let others know a little more about you and your work.</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
                <div className="border rounded-lg p-4 text-center">
                    <p className="text-muted-foreground">No recent activity to display.</p>
                </div>
            </CardContent>
        </Card>

    </div>
  )
}
