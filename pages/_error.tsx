import NextError from 'next/error'

CustomError.getInitialProps = () => {
  return { statusCode: 404 }
}

export default function CustomError() {
  return <NextError statusCode={404} />
}
