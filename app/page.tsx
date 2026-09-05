export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          Finova
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          Plataforma inteligente de gestión contable y tributaria
        </p>

        <button className="mt-8 rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800">
          Ingresar a Finova
        </button>
      </div>
    </main>
  );
}