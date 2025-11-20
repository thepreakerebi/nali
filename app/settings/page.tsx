"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxEmpty,
  ComboboxIcon,
} from "@/components/ui/base-combobox";
import { toast } from "sonner";

const settingsSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  schoolName: z
    .string()
    .min(1, "School name is required")
    .min(2, "School name must be at least 2 characters"),
  country: z
    .string()
    .min(1, "Country is required")
    .min(2, "Country name must be at least 2 characters"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// List of all countries
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export default function SettingsPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [countryInputValue, setCountryInputValue] = useState("");
  
  const filteredCountries = useMemo(() => {
    if (!countryInputValue) return COUNTRIES;
    return COUNTRIES.filter((country) =>
      country.toLowerCase().includes(countryInputValue.toLowerCase())
    );
  }, [countryInputValue]);
  
  // Get current user profile
  const userProfile = useQuery(api.functions.userProfile.queries.getCurrentUserProfile);
  const createOrUpdateProfile = useMutation(
    api.functions.userProfile.mutations.createOrUpdateUserProfile
  );

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      schoolName: "",
      country: "",
    },
  });

  // Pre-fill form with existing profile data
  useEffect(() => {
    if (userProfile) {
      if (userProfile.name) {
        form.setValue("name", userProfile.name);
      }
      if (userProfile.schoolName) {
        form.setValue("schoolName", userProfile.schoolName);
      }
      if (userProfile.country) {
        form.setValue("country", userProfile.country);
        // Use startTransition to avoid cascading renders
        startTransition(() => {
          setCountryInputValue(userProfile.country || "");
        });
      }
    }
  }, [userProfile, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    setError(null);
    
    try {
      if (!userProfile) {
        setError("User profile not found. Please sign in again.");
        return;
      }

      await createOrUpdateProfile({
        name: data.name,
        email: userProfile.email,
        profilePhoto: userProfile.profilePhoto,
        googleId: userProfile.googleId,
        schoolName: data.schoolName,
        country: data.country,
      });

      toast.success("Profile updated successfully");
      // Optionally redirect to home or stay on settings page
      // router.push("/");
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to update profile. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Show loading state while checking profile
  if (userProfile === undefined) {
    return (
      <main className="flex flex-col h-full w-full items-center justify-center p-6">
        <Spinner className="size-8" />
      </main>
    );
  }

  // Redirect to onboarding if profile doesn't exist or onboarding not completed
  if (userProfile === null || !userProfile.onboardingCompleted) {
    router.push("/onboarding");
    return null;
  }

  return (
    <main className="flex flex-col h-full w-full p-6">
      <section className="max-w-[350px] mx-auto w-full space-y-6">
        <header className="space-y-2">
          <p className="text-muted-foreground">
            Update your profile information
          </p>
        </header>

        <article>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormDescription>
                      Your full name
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="Enter your name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormDescription>
                      The name of the school where you teach
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="Enter your school name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormDescription>
                      The country where your school is located
                    </FormDescription>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={(value) => {
                          const countryValue = typeof value === "string" ? value : "";
                          field.onChange(countryValue);
                          setCountryInputValue(countryValue);
                        }}
                      >
                        <ComboboxControl>
                          <ComboboxInput
                            placeholder="Search for your country..."
                            value={countryInputValue}
                            onChange={(e) => setCountryInputValue(e.target.value)}
                          />
                          <ComboboxIcon />
                        </ComboboxControl>
                        <ComboboxContent>
                          <ComboboxList>
                            {filteredCountries.length === 0 ? (
                              <ComboboxEmpty>No country found.</ComboboxEmpty>
                            ) : (
                              filteredCountries.map((country) => (
                                <ComboboxItem key={country} value={country}>
                                  <ComboboxItemIndicator />
                                  {country}
                                </ComboboxItem>
                              ))
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <section
                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-destructive font-medium text-sm">
                    <strong>Error:</strong> {error}
                  </p>
                </section>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Spinner className="size-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </article>
      </section>
    </main>
  );
}

