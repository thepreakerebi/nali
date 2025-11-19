"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, startTransition } from "react";
import Image from "next/image";
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

const onboardingSchema = z.object({
  schoolName: z
    .string()
    .min(1, "School name is required")
    .min(2, "School name must be at least 2 characters"),
  country: z
    .string()
    .min(1, "Country is required")
    .min(2, "Country name must be at least 2 characters"),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

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

export default function Onboarding() {
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

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      schoolName: "",
      country: "",
    },
  });

  // Pre-fill form if profile exists
  useEffect(() => {
    if (userProfile) {
      if (userProfile.onboardingCompleted) {
        // Already completed onboarding, redirect to home
        router.push("/");
        return;
      }
      
      // Pre-fill form with existing data
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
  }, [userProfile, form, router]);

  const onSubmit = async (data: OnboardingFormValues) => {
    setError(null);
    
    try {
      // Get user data from profile
      // If profile doesn't exist, we need name and email from Google OAuth
      // For now, if profile exists, use its data; otherwise, we'll need to handle this
      if (!userProfile) {
        setError("User profile not found. Please sign in again.");
        return;
      }

      await createOrUpdateProfile({
        name: userProfile.name,
        email: userProfile.email,
        profilePhoto: userProfile.profilePhoto,
        googleId: userProfile.googleId,
        schoolName: data.schoolName,
        country: data.country,
      });

      // Redirect to home page after successful onboarding
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete onboarding. Please try again."
      );
    }
  };

  // Show loading state while checking profile
  if (userProfile === undefined) {
    return (
      <main className="min-h-screen w-full bg-white relative flex items-center justify-center">
        <Spinner className="size-8" />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-white relative">
      {/* Teal Glow Background */}
      <section
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #14b8a6 100%)
          `,
          backgroundSize: "100% 100%",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <header className="text-center flex flex-col items-center gap-3 mb-12">
          <Image
            src="/nali-logo.svg"
            alt="Nali Logo"
            width={115}
            height={33}
            priority
          />
          <h1 className="text-4xl font-bold text-slate-900">
            Complete Your Profile
          </h1>
          <p className="text-lg font-medium text-slate-700 max-w-md">
            Tell us about your school to get started with Nali
          </p>
        </header>

        <article className="w-full max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      School Name
                    </FormLabel>
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
                    <FormLabel>
                      Country
                    </FormLabel>
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
                  className="bg-rose-50 border border-rose-200 rounded-lg p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-rose-800 font-medium text-sm">
                    <strong>Error:</strong> {error}
                  </p>
                </section>
              )}

              <Button
                type="submit"
                variant="default-glass"
                size="lg"
                disabled={form.formState.isSubmitting}
                className="w-full rounded-full"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner className="size-4" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>
          </Form>
        </article>
      </section>
    </main>
  );
}

