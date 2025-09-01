
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  email: z.string().email(),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

const defaultAccountValues: Partial<AccountFormValues> = {
  name: "Your Name",
  email: "your.email@example.com",
}

function AccountForm() {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaultAccountValues,
  })

  function onSubmit(data: AccountFormValues) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name that will be displayed on your profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" {...field} disabled />
              </FormControl>
              <FormDescription>
                Your email address is used for account management and cannot be changed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Update account</Button>
      </form>
    </Form>
  )
}

const appearanceFormSchema = z.object({
    darkMode: z.boolean().default(true).describe("Enable dark mode."),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

const defaultAppearanceValues: Partial<AppearanceFormValues> = {
  darkMode: true,
}

function AppearanceForm() {
    const form = useForm<AppearanceFormValues>({
        resolver: zodResolver(appearanceFormSchema),
        defaultValues: defaultAppearanceValues,
    })

    function onSubmit(data: AppearanceFormValues) {
        toast({
            title: "You submitted the following values:",
            description: (
                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                    <code className="text-white">{JSON.stringify(data, null, 2)}</code>
                </pre>
            ),
        })
    }

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
            control={form.control}
            name="darkMode"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">
                    Dark Mode
                    </FormLabel>
                    <FormDescription>
                    Enable or disable dark mode for the application.
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled
                    />
                </FormControl>
                </FormItem>
            )}
            />
            <Button type="submit">Update preferences</Button>
        </form>
        </Form>
    )
}


export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8">
        <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and application settings.</p>
        </div>
        <Separator />
        
        <Card>
            <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Update your account information.</CardDescription>
            </CardHeader>
            <CardContent>
                <AccountForm />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
                <AppearanceForm />
            </CardContent>
        </Card>

    </div>
  )
}
