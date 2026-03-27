import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Input from "../../../components/Input";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";
import { useNavigate } from "react-router-dom";

interface Formateur {
  id: number;
  name: string;
}

export default function AjouterSalle() {
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [formData, setFormData] = useState({
    label: "",
    formateur1: "",
    formateur2: "",
  });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await api.get("/formateurs");

      if (res && res.data) {
        setFormateurs(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const addSalle = async () => {
    try {
      const res = await api.post("/add-classroom", formData);

      if (res && res.data) {
        navigate("/administrateur/salles");
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-50 to-white py-10">
      <div className="w-full  p-6 flex items-center justify-start">
        <ButtonNavigateBack />
      </div>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 relative">
        <h1 className="text-blue-600 text-center text-3xl font-extrabold mb-8 tracking-tight">
          Ajouter une salle
        </h1>
        <form
          className="space-y-6"
          onSubmit={e => { e.preventDefault(); addSalle(); }}
        >
          <div>
            <label htmlFor="label" className="block text-gray-700 font-semibold mb-2">
              Numéro de salle
            </label>
            <Input
              type="text"
              id="salle-label"
              placeholder="Nom de la salle"
              className="w-full bg-gray-50 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-lg transition"
              name="label"
              onChange={handleChange}
              value={formData.label}
            />
          </div>
          <div>
            <label htmlFor="formateur1" className="block text-gray-700 font-semibold mb-2">
              Formateur 1
            </label>
            <select
              onChange={handleChange}
              name="formateur1"
              value={formData.formateur1}
              className="w-full bg-gray-50 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-lg transition"
            >
              <option value="">Choisissez le formateur 1</option>
              {formateurs &&
                formateurs.map((formateur) => (
                  <option key={formateur.id} value={formateur.id}>
                    {formateur.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="formateur2" className="block text-gray-700 font-semibold mb-2">
              Formateur 2
            </label>
            <select
              onChange={handleChange}
              name="formateur2"
              value={formData.formateur2}
              className="w-full bg-gray-50 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-lg transition"
            >
              <option value="">Choisissez le formateur 2</option>
              {formateurs &&
                formateurs.map((formateur) => (
                  <option key={formateur.id} value={formateur.id}>
                    {formateur.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition text-white text-xl font-bold py-3 rounded-lg shadow-md mt-4 focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <FontAwesomeIcon icon={faPlus} />
            Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
