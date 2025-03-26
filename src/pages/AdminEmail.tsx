
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Send, Users } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendBulkEmail } from "@/utils/emailService";

interface EmailFormValues {
  subject: string;
  title: string;
  subtitle: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
}

const AdminEmail = () => {
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const form = useForm<EmailFormValues>({
    defaultValues: {
      subject: "",
      title: "",
      subtitle: "",
      content: "",
      buttonText: "Visit Website",
      buttonUrl: "https://zockto.com",
    },
  });

  // Get recipient count
  React.useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        if (error) {
          console.error("Error fetching users count:", error);
          return;
        }
        
        setRecipientCount(count);
      } catch (error) {
        console.error("Error fetching users count:", error);
      }
    };

    fetchUserCount();
  }, []);

  const onSubmit = async (values: EmailFormValues) => {
    setLoading(true);
    try {
      await sendBulkEmail(values);
      toast.success("Emails sent successfully!");
      form.reset();
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send emails. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const previewHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #6366f1; text-align: center;">${form.watch("title") || "Email Title"}</h1>
        <p style="color: #333; line-height: 1.6; font-size: 18px;">${form.watch("subtitle") || "Email Subtitle"}</p>
        <div style="color: #333; line-height: 1.6;">
          ${form.watch("content").replace(/\n/g, "<br>") || "Email content will appear here."}
        </div>
        ${form.watch("buttonText") ? 
          `<div style="text-align: center; margin-top: 30px;">
            <a 
              href="${form.watch("buttonUrl") || "#"}" 
              style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;"
            >
              ${form.watch("buttonText")}
            </a>
          </div>` 
        : ''}
        <p style="color: #333; line-height: 1.6; margin-top: 30px;">Best regards,<br>The Zockto Team</p>
      </div>
    </div>
  `;

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Admin Email Campaign</CardTitle>
            <CardDescription>
              Send customized emails to all users at once
              {recipientCount !== null && (
                <span className="ml-2 inline-flex items-center bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                  <Users className="h-3 w-3 mr-1" /> {recipientCount} recipients
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="compose">
              <TabsList className="mb-4">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="compose">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Important announcement from Zockto" {...field} />
                          </FormControl>
                          <FormDescription>
                            This will appear as the subject line in the email.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Welcome to Zockto!" {...field} />
                          </FormControl>
                          <FormDescription>
                            Main heading displayed in the email.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtitle</FormLabel>
                          <FormControl>
                            <Input placeholder="We have exciting news to share!" {...field} />
                          </FormControl>
                          <FormDescription>
                            A brief introduction shown below the title.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Write your email content here..." 
                              className="min-h-[200px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            The main content of your email. Simple line breaks are supported.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="buttonText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Text (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Visit Website" {...field} />
                            </FormControl>
                            <FormDescription>
                              Text for the call-to-action button.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="buttonUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://zockto.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Where the button should link to.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send to All Users
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="preview">
                <div className="border rounded-md p-4">
                  <h2 className="text-lg font-medium mb-2">Email Preview</h2>
                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-500">Subject:</span>
                      <span className="ml-2">{form.watch("subject") || "No subject"}</span>
                    </div>
                    <div className="border-t pt-4">
                      <iframe
                        srcDoc={previewHtml}
                        title="Email Preview"
                        className="w-full min-h-[400px] border-0"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-muted/50 text-sm text-muted-foreground">
            <p>All emails will be sent from your verified Resend domain.</p>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AdminEmail;
