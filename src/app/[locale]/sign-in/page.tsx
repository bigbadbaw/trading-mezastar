import { setRequestLocale } from 'next-intl/server';

import { SignInForm } from './SignInForm';

export default function SignInPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <SignInForm />;
}
